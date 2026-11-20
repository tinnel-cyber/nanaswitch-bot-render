import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  GraduationCap,
  CreditCard,
  Loader2,
  AlertCircle,
  Video,
  MessageSquare,
  FileText,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { LiveSession } from '../../../../types/liveSession';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';
import {
  recordStudentLiveEnrollment,
  verifyStudentLiveEnrollment,
} from '../../../../services/liveSessionService';
import { UltimateCheckout } from '../../../../components/payment/UltimateCheckout';

export interface LiveAccessGateProps {
  session: LiveSession;
  onAccessGranted: (studentName?: string) => void;
}

/**
 * Sas d'Entrée VIP pour Cours Payants / Adhésions Membres
 * Palette officielle Nanasore : Blanc cassé (#F5F7FB) + Blanc pur + Bleu Royal (#1D4ED8).
 * - Permet de régler par Mobile Money / Carte via UltimateCheckout (déblocage immédiat Supabase).
 * - Permet aux membres / étudiants déjà inscrits de vérifier leur accès par téléphone ou email.
 */
export const LiveAccessGate: React.FC<LiveAccessGateProps> = ({
  session,
  onAccessGranted,
}) => {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showMemberLookup, setShowMemberLookup] = useState(false);
  const [lookupContact, setLookupContact] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const price = Number(session.accessPrice) || 0;
  const formattedPrice = formatCFA(price);
  const accessLabel = session.accessLabel || 'Accès Cours & Salle VIP';

  const handleVerifyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupContact.trim()) return;
    playTapBeep();
    setIsChecking(true);
    setLookupError(null);

    const res = await verifyStudentLiveEnrollment(session.id, lookupContact);
    setIsChecking(false);

    if (res.enrolled) {
      playValidationBeep();
      onAccessGranted(res.studentName);
    } else {
      setLookupError(
        "Aucune inscription validée trouvée avec ce téléphone ou cet email pour cette session."
      );
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-[#F5F7FB] flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-4xl w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-blue-950/5 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Colonne Gauche : Présentation institutionnelle Bleu Royal */}
        <div className="lg:col-span-7 bg-gradient-to-br from-[#1D4ED8] via-[#1E40AF] to-[#172554] text-white p-6 sm:p-9 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-bold">
              <Lock className="w-3.5 h-3.5 text-blue-200" />
              <span>{accessLabel}</span>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-200">
                {session.storeName}
                {session.hostName ? ` • Animé par ${session.hostName}` : ''}
              </p>
              <h1 className="text-2xl sm:text-3xl font-black leading-tight text-white">
                {session.title}
              </h1>
              {session.description && (
                <p className="text-sm text-blue-100/90 leading-relaxed">
                  {session.description}
                </p>
              )}
            </div>

            {/* Ce qui est inclus dans la salle */}
            <div className="pt-2 space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                Inclus dans votre accès salle
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-medium text-white/95">
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 border border-white/10">
                  <Video className="w-4 h-4 text-blue-200 shrink-0" />
                  <span>Diffusion HD en direct</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 border border-white/10">
                  <MessageSquare className="w-4 h-4 text-blue-200 shrink-0" />
                  <span>Chat & Q&amp;A avec le formateur</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 border border-white/10">
                  <FileText className="w-4 h-4 text-blue-200 shrink-0" />
                  <span>Quiz interactifs &amp; Supports PDF</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 border border-white/10">
                  <GraduationCap className="w-4 h-4 text-blue-200 shrink-0" />
                  <span>Accès certifié &amp; sécurisé</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-blue-200/90 pt-4 border-t border-white/15">
            <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Accès immédiatement débloqué après validation Mobile Money ou Carte.</span>
          </div>
        </div>

        {/* Colonne Droite : Billetterie / Vérification Membre */}
        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-center gap-5 bg-white">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1D4ED8]">
              <Sparkles className="w-3.5 h-3.5" />
              Entrée Réservée aux Inscrits
            </span>
            <h2 className="text-xl font-black text-slate-900">
              Rejoindre la salle
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Réglez votre inscription pour entrer instantanément dans la salle de cours en direct.
            </p>
          </div>

          {/* Encadré Tarif */}
          <div className="p-4 rounded-2xl bg-[#F5F7FB] border border-blue-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block">
                Tarif d&apos;accès
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {accessLabel}
              </span>
            </div>
            <span className="text-xl font-black text-[#1D4ED8]">
              {formattedPrice}
            </span>
          </div>

          {/* Bouton Principal Paiement */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsCheckoutOpen(true);
            }}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#1D4ED8] hover:bg-[#1E40AF] active:scale-[0.99] text-white font-black text-sm shadow-lg shadow-blue-700/25 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Débloquer l&apos;accès • {formattedPrice}</span>
          </button>

          {/* Séparateur */}
          <div className="relative flex items-center py-1">
            <div className="flex-1 border-t border-slate-200" />
            <span className="px-3 text-[11px] font-semibold text-slate-400">ou</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* Accès Membres / Étudiants déjà inscrits */}
          {!showMemberLookup ? (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setShowMemberLookup(true);
              }}
              className="w-full py-3 px-4 rounded-2xl bg-[#F5F7FB] hover:bg-blue-50 text-slate-700 hover:text-[#1D4ED8] border border-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Déjà inscrit ou membre ? Vérifier mon accès</span>
            </button>
          ) : (
            <form onSubmit={handleVerifyMember} className="space-y-2.5 bg-[#F5F7FB] p-3.5 rounded-2xl border border-slate-200">
              <label className="text-[11px] font-bold text-slate-700 block">
                Téléphone ou Email utilisé lors de l&apos;inscription
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={lookupContact}
                  onChange={(e) => setLookupContact(e.target.value)}
                  placeholder="Ex: 70000000 ou nom@email.com"
                  className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                />
                <button
                  type="submit"
                  disabled={isChecking || !lookupContact.trim()}
                  className="px-3.5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Entrer</span>
                </button>
              </div>
              {lookupError && (
                <div className="flex items-start gap-1.5 text-[11px] text-rose-600 font-medium pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{lookupError}</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Popup UltimateCheckout pour paiement direct Mobile Money / Carte */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[10000]">
          <UltimateCheckout
            isModal={true}
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            onCancel={() => setIsCheckoutOpen(false)}
            product={{
              id: session.id,
              name: `${accessLabel} — ${session.title}`,
              price,
              imageUrl: session.posterUrl,
              quantity: 1,
            }}
            amount={price}
            storeName={session.storeName}
            whatsappPhone={session.whatsappPhone}
            merchantId={session.storeId}
            onSuccess={async (details) => {
              await recordStudentLiveEnrollment({
                sessionId: session.id,
                studentName: details.customerName || 'Étudiant VIP',
                studentContact: details.phoneNumber || details.customerEmail || 'membre',
                amountPaid: details.amount || price,
                transactionId: details.transactionId,
                paymentMethod: details.paymentMethod,
              });
              setIsCheckoutOpen(false);
              onAccessGranted(details.customerName);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default LiveAccessGate;
