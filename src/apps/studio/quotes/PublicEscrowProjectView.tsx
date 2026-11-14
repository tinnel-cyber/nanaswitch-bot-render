import React, { useState, useEffect, useCallback } from 'react';
import { EscrowProject, EscrowPaymentDetails } from '../../../types';
import { 
  getEscrowProject, 
  subscribeToPublicProject,
  recordClientEscrowPayment, 
  confirmProjectDelivery,
  getPublicProjectUrl
} from '../../../services/escrowService';
import { EscrowTripartiteChat } from './EscrowTripartiteChat';
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
  Share2, 
  MessageSquare, 
  Copy, 
  Check, 
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Zap,
  FolderKanban
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

  // Validation de livraison
  const [isValidatingDelivery, setIsValidatingDelivery] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);

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

            <div className="flex items-center gap-2 self-start sm:self-center">
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

        {/* ZONE D'ACTION PRINCIPALE (PAIEMENT OU VALIDATION DE LIVRAISON) */}
        {isPendingPayment && (
          /* FORMULAIRE DE BLOCAGE DES FONDS (MOBILE MONEY) */
          <section className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Consigner les fonds sous Séquestre</h3>
                <p className="text-xs text-slate-400">
                  Effectuez le transfert Mobile Money pour sécuriser le démarrage des travaux
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              {/* Opérateur selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Choisissez votre opérateur Mobile Money
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Orange Money', 'Wave', 'Moov Africa', 'MTN Mobile'].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setSelectedOperator(op);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                        selectedOperator === op
                          ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-400'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions Box */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Numéro Marchand Séquestre Nana :</span>
                  <strong className="text-amber-300 font-mono font-bold">+226 70 00 00 00 / +225 07 00 00 00</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Montant exact à transférer :</span>
                  <strong className="text-white font-bold">{formatCFA(project.totalAmount)}</strong>
                </div>
                <p className="text-[10px] text-slate-400 pt-1">
                  Les fonds restent bloqués jusqu'à ce que vous validiez personnellement la conformité du travail.
                </p>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Votre numéro de téléphone</label>
                  <input
                    type="tel"
                    value={clientPhoneNumber}
                    onChange={(e) => setClientPhoneNumber(e.target.value)}
                    placeholder="Ex: +226 70 12 34 56"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Référence SMS de la transaction reçue <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={smsTransactionRef}
                    onChange={(e) => setSmsTransactionRef(e.target.value)}
                    placeholder="Ex: MP2409.12345.B98"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessingPayment || !smsTransactionRef.trim()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 transition cursor-pointer"
              >
                <Lock className="w-4 h-4 text-amber-300" />
                <span>Bloquer les fonds sous Séquestre ({formatCFA(project.totalAmount)})</span>
              </button>
            </form>
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

        {/* Footer */}
        <footer className="text-center py-4 text-xs text-slate-500 space-y-1">
          <p>© Nanasore Guarantee • Système de Tiers de Confiance et Séquestre Financier</p>
          <p className="text-[10px]">Toutes les transactions sont chiffrées et protégées.</p>
        </footer>
      </div>
    </div>
  );
};

export default PublicEscrowProjectView;
