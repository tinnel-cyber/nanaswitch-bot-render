import React, { useState, useEffect, useCallback } from 'react';
import { EscrowProject, EscrowPaymentDetails } from '../../../types';
import { 
  getEscrowProject, 
  subscribeToPublicProject,
  recordClientEscrowPayment, 
  confirmProjectDelivery,
  releasePartialEscrowAmount,
  updateEscrowStatus,
  getPublicProjectUrl
} from '../../../services/escrowService';
import { supabase } from '../../../lib/supabase';
import { EscrowTripartiteChat } from './EscrowTripartiteChat';
import { SignatureStampModal } from '../../../components/quotes/SignatureStampModal';
import { generateSignedQuotePdf, saveContractProofToAdmin } from '../../../services/contractProofService';
import UltimateCheckout, { PaymentSuccessDetails } from '../../../components/payment/UltimateCheckout';
import { formatCFA, playTapBeep, playValidationBeep, playCashChime } from '../../../utils/audio';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Clock, 
  Building, 
  User, 
  Phone, 
  Printer, 
  Download,
  Share2, 
  MessageSquare, 
  Copy, 
  Check, 
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Zap,
  FolderKanban,
  X
} from 'lucide-react';

interface PublicEscrowProjectViewProps {
  projectId: string;
  onBackToApp?: () => void;
}

export const PublicEscrowProjectView: React.FC<PublicEscrowProjectViewProps> = ({
  projectId,
  onBackToApp,
}) => {
  const [project, setProject] = useState<EscrowProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulaire Paiement Mobile Money Client
  const [selectedOperator, setSelectedOperator] = useState('Orange Money');
  const [clientPhoneNumber, setClientPhoneNumber] = useState('');
  const [smsTransactionRef, setSmsTransactionRef] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Validation de livraison & Déblocage progressif par jalon / montant saisi
  const [isValidatingDelivery, setIsValidatingDelivery] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [showClientSignModal, setShowClientSignModal] = useState(false);
  const [contractProofSent, setContractProofSent] = useState(false);
  const [partialReleaseInput, setPartialReleaseInput] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [clientDisputeReason, setClientDisputeReason] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [partialReleaseNote, setPartialReleaseNote] = useState('');
  const [isReleasingPartial, setIsReleasingPartial] = useState(false);
  const [partialReleaseMsg, setPartialReleaseMsg] = useState<string | null>(null);

  // Chargement et écoute en temps réel du projet
  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToPublicProject(projectId, (proj) => {
      setLoading(false);
      if (proj) {
        setProject(proj);
        if (proj.clientPhone && !clientPhoneNumber) {
          setClientPhoneNumber(proj.clientPhone);
        }
      } else {
        setError("Le devis ou projet demandé est introuvable ou a été archivé.");
      }
    });

    return () => {
      unsubscribe();
    };
  }, [projectId]);

  // Copier le lien
  const handleCopyLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://nanasore.com';
    if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
      try {
        await (navigator as any).share({
          title: project?.projectTitle || 'Devis Sécurisé Nanasore',
          url: url,
        });
        return;
      } catch (err) {}
    }
    if (typeof window !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
    setIsCopiedLink(true);
    setTimeout(() => setIsCopiedLink(false), 2000);
  };

  // Soumission du paiement client (bloque les fonds sous séquestre)
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !smsTransactionRef.trim() || !clientPhoneNumber.trim()) return;

    playTapBeep();
    setIsProcessingPayment(true);

    const paymentDetails: EscrowPaymentDetails = {
      provider: selectedOperator,
      phoneNumber: clientPhoneNumber.trim(),
      transactionRef: smsTransactionRef.trim(),
      paidAt: Date.now(),
      amount: project.totalAmount,
    };

    try {
      await recordClientEscrowPayment(project.id, project.storeId, paymentDetails);
      playCashChime();
      setPaymentSuccess(true);
      setProject(prev => prev ? { ...prev, status: 'funds_locked', paymentDetails } : null);
    } catch (err) {
      console.warn('Erreur paiement séquestre :', err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Validation de la livraison par le client (débloque les fonds)
  const handleConfirmDelivery = async () => {
    if (!project) return;
    const confirmChoice = window.confirm(
      "Confirmez-vous que vous avez reçu et vérifié l'ensemble des livrables ? Cette action débloquera immédiatement les fonds en faveur du prestataire."
    );
    if (!confirmChoice) return;

    playTapBeep();
    setIsValidatingDelivery(true);

    try {
      await confirmProjectDelivery(project.id, project.storeId);
      playValidationBeep();
      setDeliveryConfirmed(true);
      setProject(prev => prev ? { ...prev, status: 'completed_released' } : null);
    } catch (err) {
      console.warn('Erreur validation livraison :', err);
    } finally {
      setIsValidatingDelivery(false);
    }
  };

  // Partager sur WhatsApp
  const handleShareWhatsApp = () => {
    if (!project) return;
    const text = `Suivi de projet sécurisé : "${project.projectTitle}" via Nana Guarantee.\nLien : ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 animate-pulse mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-300">Chargement sécurisé du projet...</p>
        <p className="text-xs text-slate-500">Tiers de confiance Nana Guarantee</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-extrabold text-white mb-1">Projet introuvable</h2>
        <p className="text-xs text-slate-400 max-w-sm text-center mb-4">{error || "Ce projet n'existe pas."}</p>
        {onBackToApp && (
          <button
            type="button"
            onClick={onBackToApp}
            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            Retour à Nanasore
          </button>
        )}
      </div>
    );
  }

  const isDisputed = project.status === 'disputed_paused';
  const isRefunded = project.status === 'refunded_client';
  const isPendingPayment = (project.status === 'sent' || project.status === 'draft') && !isDisputed && !isRefunded;
  const isFundsLocked = (project.status === 'funds_locked' || project.status === 'work_in_progress') && !isDisputed;
  const isDelivered = project.status === 'delivered' && !isDisputed;
  const isCompleted = (project.status === 'completed_released' || project.status === 'funds_withdrawn') && !isDisputed;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-6 px-3 sm:px-6">
      <div className="w-full max-w-3xl space-y-5">
        
        {/* En-tête Prestataire & Statut Tiers de Confiance */}
        <header className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Garantie Séquestre • Nana Guarantee</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">{project.projectTitle}</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Émis par <strong className="text-slate-200">{project.storeName || 'Le Prestataire'}</strong> ({project.merchantName})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (!project.clientSignatureDataUrl) {
                    setShowClientSignModal(true);
                  } else {
                    generateSignedQuotePdf(project, { autoSave: true });
                  }
                }}
                className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-950/30 transition cursor-pointer"
                title="Signer en ligne et télécharger le contrat PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{project.clientSignatureDataUrl ? 'Télécharger Contrat PDF' : 'Signer & Télécharger PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Imprimer le devis ou la preuve"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Imprimer</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Copier le lien"
              >
                {isCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedLink ? 'Copié !' : 'Partager'}</span>
              </button>

              {(isFundsLocked || isDelivered) && !isDisputed && (
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setShowDisputeModal(true);
                  }}
                  className="py-2 px-3 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Ouvrir un litige officiel (gel conservatoire & arbitrage Super Admin)"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Signaler un litige</span>
                </button>
              )}
            </div>
          </div>

          {/* Statut Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">État financier du Séquestre</span>
              <div className="flex items-center gap-2">
                {isDisputed ? (
                  <span className="inline-flex items-center gap-1 text-xs font-black text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/40 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    Projet Suspendu / Arbitrage Super Admin
                  </span>
                ) : isRefunded ? (
                  <span className="inline-flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    Client Remboursé (Clôturé)
                  </span>
                ) : isPendingPayment ? (
                  <span className="inline-flex items-center gap-1 text-xs font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/30">
                    <Clock className="w-3.5 h-3.5" />
                    En attente de consignation des fonds
                  </span>
                ) : isFundsLocked ? (
                  <span className="inline-flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                    <Lock className="w-3.5 h-3.5" />
                    Fonds bloqués et sécurisés sous séquestre
                  </span>
                ) : isDelivered ? (
                  <span className="inline-flex items-center gap-1 text-xs font-black text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/30">
                    <Clock className="w-3.5 h-3.5" />
                    Livrables déposés : En attente de votre validation
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Prestation validée & Clôturée
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Montant Garanti</span>
              <span className="text-xl font-black text-amber-300 font-mono">{formatCFA(project.totalAmount)}</span>
            </div>
          </div>
        </header>

        {/* BANNIÈRE DE SUSPENSION / ARBITRAGE EN COURS */}
        {isDisputed && (
          <div className="p-4 sm:p-5 rounded-3xl bg-rose-950/70 border border-rose-500/60 shadow-xl space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>Projet Temporairement Suspendu par la Médiation Super Admin</span>
            </div>
            <p className="text-xs text-rose-200/90 leading-relaxed">
              Une procédure de médiation et d'arbitrage a été déclenchée par le Tiers de Confiance Nana Guarantee. 
              Les déblocages de fonds et les validations sont temporairement gelés à titre conservatoire.
            </p>
            {project.disputeReason && (
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-rose-900/60 text-xs text-rose-300 space-y-1">
                <span className="font-bold uppercase tracking-wider text-[10px] text-rose-400 block">Motif d'intervention :</span>
                <p>{project.disputeReason}</p>
              </div>
            )}
            <p className="text-[11px] text-rose-300/80">
              Veuillez utiliser la messagerie tripartite au bas de cette page pour échanger directement avec le médiateur Super Admin et le prestataire.
            </p>
          </div>
        )}

        {/* BANNIÈRE REMBOURSEMENT EFFECTUÉ */}
        {isRefunded && (
          <section className="bg-amber-950/60 border border-amber-500/40 rounded-3xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Litige Clos : Client Remboursé</h3>
              <p className="text-xs text-amber-200/90 max-w-md mx-auto">
                L'arbitrage de la plateforme a ordonné le remboursement intégral de votre règlement sous séquestre ({formatCFA(project.totalAmount)}).
              </p>
              {project.resolutionNotes && (
                <p className="text-[11px] text-slate-400 italic mt-1">
                  Note du médiateur : "{project.resolutionNotes}"
                </p>
              )}
            </div>
          </section>
        )}

        {/* DETAILS DES JALONS & LIVRABLES */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Feuille de Route & Jalons Contractuels
            </h2>
            <span className="text-xs text-slate-400">{project.milestones.length} étapes</span>
          </div>

          <div className="space-y-2.5">
            {project.milestones.map((m, idx) => (
              <div
                key={m.id || idx}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-white">{m.title}</span>
                  </div>
                  {m.description && (
                    <p className="text-[11px] text-slate-400 pl-7">{m.description}</p>
                  )}
                  {m.deadline && (
                    <span className="text-[10px] text-slate-500 pl-7 block">
                      Délai estimé : {m.deadline}
                    </span>
                  )}
                </div>

                <div className="text-right pl-7 sm:pl-0">
                  <span className="text-xs font-black text-amber-300 font-mono">
                    {formatCFA(m.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Conditions générales */}
          {project.termsAndConditions && (
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Modalités et Conditions de Garantie :
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                {project.termsAndConditions}
              </p>
            </div>
          )}
        </section>

        {/* DÉBLOCAGE PROGRESSIF EN JALON (BOUTONS + CHAMP DE SAISIE MONTANT) */}
        {(project.status === 'funds_locked' || project.status === 'work_in_progress' || project.status === 'delivered') && !isDisputed && !isRefunded && (() => {
          const releasedAmt = Math.max(0, Math.round(Number(project.releasedAmount) || 0));
          const remainingAmt = Math.max(0, Math.round(project.totalAmount) - releasedAmt);
          const progressPct = project.totalAmount > 0 ? Math.min(100, Math.round((releasedAmt / project.totalAmount) * 100)) : 0;

          const handlePartialRelease = async (amtToRelease: number, noteLabel?: string) => {
            if (amtToRelease <= 0 || amtToRelease > remainingAmt) return;
            setIsReleasingPartial(true);
            setPartialReleaseMsg(null);
            try {
              const updated = await releasePartialEscrowAmount(project, amtToRelease, noteLabel || partialReleaseNote);
              setProject(updated);
              setPartialReleaseInput('');
              setPartialReleaseNote('');
              playCashChime();
              setPartialReleaseMsg(`✓ ${formatCFA(amtToRelease)} débloqués avec succès pour le prestataire.`);
            } catch (err: any) {
              setPartialReleaseMsg(`⚠️ ${err?.message || 'Erreur lors du déblocage partiel.'}`);
            } finally {
              setIsReleasingPartial(false);
            }
          };

          return (
            <section className="bg-slate-900 border border-emerald-500/35 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Unlock className="w-4 h-4 text-emerald-400" />
                    <span>Déblocage Progressif des Fonds (Jalons & Activité)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Débloquez un montant précis selon l'avancement du projet sur les fonds consignés.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Reste sous séquestre</span>
                  <span className="text-base font-black text-amber-300 font-mono">{formatCFA(remainingAmt)}</span>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-emerald-400">Débloqué : {formatCFA(releasedAmt)} ({progressPct}%)</span>
                  <span className="text-slate-400">Total : {formatCFA(project.totalAmount)}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {remainingAmt > 0 && (
                <>
                  {/* Boutons rapides par jalon */}
                  <div className="flex flex-wrap gap-2">
                    {project.milestones.map((m, idx) => {
                      const canClick = m.amount > 0 && m.amount <= remainingAmt;
                      return (
                        <button
                          key={m.id || idx}
                          type="button"
                          disabled={!canClick || isReleasingPartial}
                          onClick={() => handlePartialRelease(m.amount, `Jalon ${idx + 1} : ${m.title}`)}
                          className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-emerald-950/60 border border-emerald-500/30 disabled:opacity-40 text-emerald-300 text-xs font-bold transition cursor-pointer"
                        >
                          Débloquer Jalon {idx + 1} ({formatCFA(m.amount)})
                        </button>
                      );
                    })}
                  </div>

                  {/* Champ de saisie de montant libre + bouton valider */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <input
                      type="number"
                      min={100}
                      max={remainingAmt}
                      value={partialReleaseInput}
                      onChange={(e) => setPartialReleaseInput(e.target.value)}
                      placeholder={`Montant à débloquer (max ${remainingAmt})`}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={partialReleaseNote}
                      onChange={(e) => setPartialReleaseNote(e.target.value)}
                      placeholder="Motif / étape (ex: Achat matériel, Phase 1)"
                      className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={isReleasingPartial || !partialReleaseInput || Number(partialReleaseInput) <= 0 || Number(partialReleaseInput) > remainingAmt}
                      onClick={() => handlePartialRelease(Number(partialReleaseInput), partialReleaseNote)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>{isReleasingPartial ? 'Déblocage...' : 'Débloquer ce montant'}</span>
                    </button>
                  </div>
                </>
              )}

              {partialReleaseMsg && (
                <p className="text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
                  {partialReleaseMsg}
                </p>
              )}

              {Array.isArray(project.partialReleases) && project.partialReleases.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Historique des déblocages ({project.partialReleases.length})
                  </span>
                  {project.partialReleases.slice(0, 5).map((rel) => (
                    <div key={rel.id} className="flex items-center justify-between text-xs bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800/80">
                      <span className="text-slate-300 truncate">{rel.note || 'Déblocage'}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-emerald-400 font-mono">+{formatCFA(rel.amount)}</span>
                        <span className="text-[10px] text-slate-500">{new Date(rel.releasedAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })()}

        {/* ZONE D'ACTION PRINCIPALE (PAIEMENT OU VALIDATION DE LIVRAISON) */}
        {isPendingPayment && (
          <section className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Consigner les fonds sous Séquestre</h3>
                  <p className="text-xs text-slate-400">
                    Paiement multi-opérateurs sécurisé — les fonds restent bloqués jusqu&apos;à votre validation finale.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" /> Protection Séquestre 100%
              </span>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 flex items-center gap-2.5 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Pour votre sécurité, aucun paiement ne doit être effectué en dehors de la plateforme : seul ce checkout officiel active la garantie Séquestre.
              </span>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-950/60 border border-slate-800 p-1 sm:p-2">
              <UltimateCheckout
                isModal={false}
                enablePhysicalPosToken={false}
                orderId={project.id}
                amount={project.totalAmount}
                currency="FCFA"
                storeName={project.storeName}
                merchantId={project.storeId}
                product={{
                  id: project.id,
                  name: project.projectTitle,
                  price: project.totalAmount,
                  description: project.projectDescription || 'Prestation sécurisée sous Séquestre',
                }}
                defaultCustomerName={project.clientName}
                defaultPhone={project.clientPhone || ''}
                onSuccess={async (details: PaymentSuccessDetails) => {
                  const providerName =
                    typeof details.operator === 'string'
                      ? details.operator
                      : details.operator?.name || details.paymentMethod || 'Mobile Money';
                  const paymentDetails: EscrowPaymentDetails = {
                    provider: providerName,
                    phoneNumber: details.phoneNumber || project.clientPhone || '',
                    transactionRef: details.transactionId,
                    paidAt: details.timestamp || Date.now(),
                    amount: details.amount || project.totalAmount,
                  };
                  try {
                    setIsProcessingPayment(true);
                    await recordClientEscrowPayment(project.id, project.storeId, paymentDetails);
                    playCashChime();
                    setPaymentSuccess(true);
                    setProject(prev => prev ? { ...prev, status: 'funds_locked', paymentDetails } : null);
                  } catch (err) {
                    console.warn('Erreur paiement séquestre :', err);
                  } finally {
                    setIsProcessingPayment(false);
                  }
                }}
              />
            </div>
          </section>
        )}

        {/* CAS : LIVRABLE REMIS -> BOUTON DE VALIDATION CLIENT */}
        {isDelivered && (
          <section className="bg-gradient-to-br from-purple-950/80 via-slate-900 to-emerald-950/80 border border-purple-500/50 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Le prestataire a déposé vos livrables !</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Veuillez vérifier les travaux et confirmer que tout est conforme. 
                Dès votre clic, les fonds sous séquestre ({formatCFA(project.totalAmount)}) seront débloqués pour le prestataire.
              </p>
            </div>

            <button
              type="button"
              onClick={handleConfirmDelivery}
              disabled={isValidatingDelivery}
              className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-950/50 transition transform active:scale-98 cursor-pointer flex items-center justify-center gap-2 mx-auto"
            >
              <Unlock className="w-5 h-5 text-amber-300" />
              <span>Projet reçu avec succès / Valider la livraison</span>
            </button>
          </section>
        )}

        {/* CAS : PRESTATION TERMINÉE ET VALIDÉE */}
        {isCompleted && (
          <section className="bg-emerald-950/60 border border-emerald-500/40 rounded-3xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-base font-black text-white">Mission Validée et Clôturée avec Succès</h3>
              <p className="text-xs text-emerald-300">
                Les fonds ont été débloqués. Merci d'avoir utilisé la garantie Tiers de Confiance Nanasore.
              </p>
            </div>
          </section>
        )}

        {/* SECTION MESSAGERIE & ÉCHANGES TRIPARTITES (CLIENT / PRESTATAIRE / MÉDIATION) */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Messagerie & Échanges Tripartites
              </h2>
              <p className="text-[11px] text-slate-400">
                Canal direct de communication avec le prestataire et la médiation Super Admin
              </p>
            </div>
          </div>

          <div className="h-[480px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
            <EscrowTripartiteChat
              projectId={project.id}
              storeId={project.storeId}
              currentUserRole="CLIENT"
              currentUserName={project.clientName || 'Client'}
              isDisputed={isDisputed}
              disputeReason={project.disputeReason}
            />
          </div>
        </section>

        {contractProofSent && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center">
            ✓ Contrat signé et téléchargé — Une copie certifiée a été archivée auprès du Super Admin comme preuve de contrat.
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-4 text-xs text-slate-500 space-y-1">
          <p>© Nanasore Guarantee • Système de Tiers de Confiance et Séquestre Financier</p>
          <p className="text-[10px]">Toutes les transactions sont chiffrées et protégées.</p>
        </footer>
      </div>

      {/* Modale de Signature en ligne Commandeur avant téléchargement */}
      <SignatureStampModal
        isOpen={showClientSignModal}
        mode="CLIENT"
        title="Signature en ligne du Commandeur"
        defaultCompanyName={project.merchantName || project.storeName}
        contractSummary={{
          providerName: project.merchantName || project.storeName,
          clientName: project.clientName,
          projectTitle: project.projectTitle,
          totalAmount: project.totalAmount,
          milestonesCount: project.milestones?.length || 1,
        }}
        onClose={() => setShowClientSignModal(false)}
        onConfirm={async ({ signatureDataUrl }) => {
          const signedAt = Date.now();
          const signedProject = {
            ...project,
            clientSignatureDataUrl: signatureDataUrl,
            clientSignedAt: signedAt,
            updatedAt: signedAt,
          };
          setProject(signedProject);
          setShowClientSignModal(false);

          const pdfResult = generateSignedQuotePdf(signedProject, { autoSave: false });
          const proof = await saveContractProofToAdmin(signedProject, pdfResult.dataUrl);
          const certifiedProject = {
            ...signedProject,
            contractProofHash: proof.contractProofHash,
            contractProofSubmittedAt: proof.createdAt,
          };
          setProject(certifiedProject);
          generateSignedQuotePdf(certifiedProject, { autoSave: true });
          playValidationBeep();
          setContractProofSent(true);
        }}
      />

      {/* Modale Ouverture de Litige Commandeur -> Super Admin & Tableau de Bord Litiges */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-black text-white">Signaler un Litige Officiel</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Votre litige sera transmis immédiatement au <strong>Super Admin</strong> et au <strong>Tableau de Bord Litiges</strong>. Les fonds ({formatCFA(project.totalAmount)}) seront gelés à titre conservatoire pendant l'arbitrage.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!clientDisputeReason.trim()) return;
                setIsSubmittingDispute(true);
                try {
                  const reason = `[Commandeur] ${clientDisputeReason.trim()}`;
                  await updateEscrowStatus(project.id, project.storeId, 'disputed_paused', {
                    disputeReason: reason,
                    disputedAt: Date.now(),
                  });
                  await fetch('/api/merchant/disputes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      tenantId: project.storeId,
                      orderId: project.id,
                      customerName: project.clientName,
                      amount: project.totalAmount,
                      reason,
                    }),
                  }).catch(() => {});
                  await supabase.from('merchant_disputes').insert({
                    id: `DSP-${Date.now().toString(36).toUpperCase()}`,
                    tenant_id: project.storeId,
                    order_id: project.id,
                    customer_name: project.clientName,
                    amount: project.totalAmount,
                    reason,
                    status: 'OPEN',
                    created_at: new Date().toISOString(),
                  }).then(null, () => {});
                  setProject((prev) => prev ? { ...prev, status: 'disputed_paused', disputeReason: reason, disputedAt: Date.now() } : prev);
                  playValidationBeep();
                  setShowDisputeModal(false);
                  setClientDisputeReason('');
                } finally {
                  setIsSubmittingDispute(false);
                }
              }}
              className="space-y-3"
            >
              <textarea
                rows={3}
                required
                value={clientDisputeReason}
                onChange={(e) => setClientDisputeReason(e.target.value)}
                placeholder="Décrivez le motif de votre réclamation (retard, non-conformité, etc.)..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispute || !clientDisputeReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black cursor-pointer"
                >
                  {isSubmittingDispute ? 'Envoi...' : 'Soumettre le Litige'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicEscrowProjectView;
