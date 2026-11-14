import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Receipt,
  MessageCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { verifyCheckoutSession } from '../../paymentApiService';

export interface CheckoutReturnViewProps {
  onBackToStore?: () => void;
}

type SessionStatus = 'loading' | 'approved' | 'pending' | 'rejected' | 'error';

export const CheckoutReturnView: React.FC<CheckoutReturnViewProps> = ({ onBackToStore }) => {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('checkout_session_id') || params.get('session_id') || params.get('id') || '';
    setSessionId(id);

    if (!id) {
      setStatus('error');
      setErrorMessage("Identifiant de session manquant dans l'URL.");
      return;
    }

    let isMounted = true;

    async function checkStatus() {
      try {
        const res = await verifyCheckoutSession(id);
        if (!isMounted) return;

        setSessionDetails(res);

        const txStatus = String(res.transaction_status || (res.session && res.session.transaction_status) || '').toLowerCase();

        if (res.isPaid || res.isApproved || txStatus === 'approved') {
          setStatus('approved');
          try {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          } catch {}
        } else if (txStatus === 'pending') {
          setStatus('pending');
        } else if (['rejected', 'failed', 'declined', 'cancelled'].includes(txStatus)) {
          setStatus('rejected');
        } else {
          // Si le statut est inconnu mais que la r├®ponse a r├®ussi
          setStatus(res.success ? 'pending' : 'rejected');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('[CHECKOUT RETURN ERROR]', err);
        setStatus('error');
        setErrorMessage(err.message || 'Impossible de v├®rifier la session de paiement aupr├¿s de Sebpay.');
      }
    }

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRetryCheck = async () => {
    if (!sessionId) return;
    setStatus('loading');
    setErrorMessage(null);
    try {
      const res = await verifyCheckoutSession(sessionId);
      setSessionDetails(res);
      const txStatus = String(res.transaction_status || '').toLowerCase();
      if (res.isPaid || res.isApproved || txStatus === 'approved') {
        setStatus('approved');
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch {}
      } else if (txStatus === 'pending') {
        setStatus('pending');
      } else {
        setStatus('rejected');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Erreur lors de la rev├®rification.');
    }
  };

  const handleReturn = () => {
    if (onBackToStore) {
      onBackToStore();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const formatCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(amount).replace('XOF', 'FCFA');
  };

  const orderId = sessionDetails?.orderId || sessionDetails?.session?.metadata?.orderId || 'N/A';
  const amount = Number(sessionDetails?.amount || sessionDetails?.session?.amount || 0);
  const currency = sessionDetails?.currency || 'XOF';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_20%,rgba(37,99,235,0.12),transparent_70%)]" />

      <div className="relative max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">

        {/* 1. ├ëTAT DE CHARGEMENT */}
        {status === 'loading' && (
          <div className="space-y-6 py-6 animate-in fade-in duration-300">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-blue-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                V├®rification de votre paiement...
              </h2>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Nous interrogeons en direct la passerelle s├®curis├®e Sebpay pour certifier votre transaction.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-300">
              <ShieldCheck className="w-4 h-4" />
              <span>Contr├┤le cryptographique s├®curis├®</span>
            </div>
          </div>
        )}

        {/* 2. ├ëTAT SUCC├êS / APPROUV├ë */}
        {status === 'approved' && (
          <div className="space-y-6 py-2 animate-in zoom-in-95 duration-400">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Paiement 100% Confirm├®</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Paiement Valid├® avec Succ├¿s !
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
                Votre transaction a ├®t├® approuv├®e par Sebpay. Votre commande est imm├®diatement enregistr├®e et pr├®par├®e pour exp├®dition.
              </p>
            </div>

            {/* R├®capitulatif de la transaction */}
            <div className="p-4.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-left space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-slate-500" />
                  N┬░ Commande
                </span>
                <span className="font-mono font-bold text-slate-200">
                  #{orderId}
                </span>
              </div>
              {amount > 0 && (
                <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400">Montant D├®bit├®</span>
                  <span className="font-mono font-black text-emerald-400 text-base">
                    {formatCFA(amount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-slate-800/80">
                <span className="text-slate-400">Mode de r├¿glement</span>
                <span className="font-semibold text-slate-300">Sebpay Hosted Checkout</span>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleReturn}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Retourner ├á la boutique</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </button>

              <a
                href="https://wa.me/22665565805"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl border border-slate-800 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Une question ? Assistance WhatsApp NaNa</span>
              </a>
            </div>
          </div>
        )}

        {/* 3. ├ëTAT EN ATTENTE (PENDING) */}
        {status === 'pending' && (
          <div className="space-y-6 py-2 animate-in fade-in duration-300">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20">
              <Clock className="w-10 h-10 animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                <span>En attente de validation</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Paiement en Cours de Traitement
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
                Votre transaction est en cours de validation aupr├¿s de l'op├®rateur Mobile Money. Vous recevrez une notification par SMS / WhatsApp d├¿s confirmation.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left text-xs sm:text-sm text-amber-200 leading-relaxed">
              ­ƒÆí <strong>Rappel :</strong> Si vous avez d├®j├á valid├® sur votre mobile avec votre code secret, la confirmation op├®rateur prend g├®n├®ralement entre 10 et 60 secondes.
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleRetryCheck}
                className="w-full py-3.5 px-6 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm sm:text-base shadow-xl shadow-amber-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <RotateCcw className="w-4.5 h-4.5" />
                <span>Actualiser le statut</span>
              </button>

              <button
                type="button"
                onClick={handleReturn}
                className="w-full py-3 px-4 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-semibold transition"
              >
                <span>Retourner ├á la boutique</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. ├ëTAT REJET├ë OU ANNUL├ë */}
        {(status === 'rejected' || status === 'error') && (
          <div className="space-y-6 py-2 animate-in fade-in duration-300">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/20">
              <XCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Transaction Non Valid├®e</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Paiement Non Abouti
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
                {errorMessage || "La demande de paiement a ├®t├® refus├®e, annul├®e ou a expir├® aupr├¿s de l'op├®rateur. Aucun montant n'a ├®t├® d├®bit├® de votre compte."}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-left text-xs sm:text-sm text-rose-200">
              ÔÜá´©Å V├®rifiez votre solde Mobile Money et r├®essayez ou optez pour un autre op├®rateur.
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.history.back();
                  }
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <RotateCcw className="w-4.5 h-4.5" />
                <span>R├®essayer le paiement</span>
              </button>

              <button
                type="button"
                onClick={handleReturn}
                className="w-full py-3 px-4 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-semibold transition"
              >
                <span>Retourner ├á l'accueil</span>
              </button>
            </div>
          </div>
        )}

        {/* Pied de page s├®curis├® */}
        <div className="pt-6 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Passerelle S├®curis├®e Nanasore &bull; Cryptage TLS 256-bit</span>
        </div>

      </div>
    </div>
  );
};

export default CheckoutReturnView;
