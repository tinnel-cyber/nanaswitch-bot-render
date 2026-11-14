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
  MessageCircle,
  Download,
  ExternalLink,
  FileText,
  Sparkles,
  Store,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { verifyCheckoutSession } from '../../paymentApiService';
import {
  DigitalReceiptPayload,
  downloadDigitalReceiptPdf,
  getDigitalReceiptWhatsAppUrl,
  sendDigitalReceiptViaApi
} from '../../digitalReceiptService';

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

  const formatCFA = (amountVal: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(amountVal).replace('XOF', 'FCFA');
  };

  const orderId = sessionDetails?.orderId || sessionDetails?.session?.metadata?.orderId || 'CMD-9841';
  const amount = Number(sessionDetails?.amount || sessionDetails?.session?.amount || 0);
  const currency = sessionDetails?.currency || 'XOF';
  const storeName = sessionDetails?.storeName || sessionDetails?.session?.metadata?.storeName || (typeof window !== 'undefined' ? localStorage.getItem('nana_store_name') : null) || 'Boutique Nanasore';
  const storePhone = sessionDetails?.storePhone || sessionDetails?.session?.metadata?.storePhone || (typeof window !== 'undefined' ? localStorage.getItem('nana_store_phone') : null) || '+221 77 000 00 00';
  const storeAddress = sessionDetails?.storeAddress || sessionDetails?.session?.metadata?.storeAddress || (typeof window !== 'undefined' ? localStorage.getItem('nana_store_address') : null) || 'Dakar / Abidjan';
  const customerName = sessionDetails?.customerName || sessionDetails?.session?.metadata?.customerName || (typeof window !== 'undefined' ? localStorage.getItem('nana_customer_name') : null) || 'Client';
  const customerPhone = sessionDetails?.customerPhone || sessionDetails?.session?.metadata?.customerPhone || (typeof window !== 'undefined' ? localStorage.getItem('nana_customer_phone') : null) || '';
  const customerEmail = sessionDetails?.customerEmail || sessionDetails?.session?.metadata?.customerEmail || (typeof window !== 'undefined' ? localStorage.getItem('nana_customer_email') : null) || '';
  const productName = sessionDetails?.productName || sessionDetails?.description || sessionDetails?.session?.metadata?.productName || 'Produit Numérique';

  const receiptPayload: DigitalReceiptPayload = {
    orderId,
    transactionId: sessionDetails?.transactionId || sessionDetails?.id || sessionId || orderId,
    customerName,
    customerPhone,
    customerEmail,
    storeName,
    storePhone,
    storeAddress,
    items: sessionDetails?.items || [
      {
        name: productName,
        quantity: 1,
        price: amount || 5000,
        total: amount || 5000,
        isDigital: true,
        downloadUrl: `/download/${orderId}`,
        category: 'Produit Numérique'
      }
    ],
    totalAmount: amount || 5000,
    currency,
    paymentMethod: 'Sebpay Hosted Checkout',
    downloadUrl: `/download/${orderId}`,
    clientDashboardUrl: `/client/dashboard`,
    expiresInSeconds: 3600
  };

  // Dispatch automatique du reçu côté API et email en arrière-plan dès approbation
  useEffect(() => {
    if (status === 'approved' && orderId) {
      sendDigitalReceiptViaApi(receiptPayload).catch(() => {});
    }
  }, [status, orderId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_20%,rgba(37,99,235,0.12),transparent_70%)]" />

      <div className="relative max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">

        {/* 1. ÉTAT DE CHARGEMENT */}
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
                Vérification de votre paiement...
              </h2>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Nous interrogeons en direct la passerelle sécurisée Sebpay pour certifier votre transaction.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-300">
              <ShieldCheck className="w-4 h-4" />
              <span>Contrôle cryptographique sécurisé</span>
            </div>
          </div>
        )}

        {/* 2. ÉTAT SUCCÈS / APPROUVÉ : REÇU DE PAIEMENT & ACCÈS TÉLÉCHARGEMENT */}
        {status === 'approved' && (
          <div className="space-y-5 py-2 animate-in zoom-in-95 duration-400">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Paiement 100% Confirmé • Reçu Délivré</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Paiement Validé avec Succès !
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                Votre transaction a été approuvée. Voici votre reçu officiel et vos accès directs aux produits numériques.
              </p>
            </div>

            {/* COORDONNÉES DE LA BOUTIQUE CONCERNÉE */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-left flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">{storeName}</h4>
                  <p className="text-[11px] text-slate-400">
                    {storeAddress} • Tél : {storePhone}
                  </p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Boutique Certifiée
              </span>
            </div>

            {/* RÉCAPITULATIF DE LA COMMANDE ET DES ARTICLES */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-left space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-slate-500" />
                  Réf. Commande
                </span>
                <span className="font-mono font-bold text-slate-200">
                  #{orderId}
                </span>
              </div>

              {/* Liste détaillée des articles */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Articles Achetés
                </span>
                {receiptPayload.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-xs text-slate-200">
                    <span className="flex items-center gap-1.5 truncate max-w-[240px]">
                      <span className="text-blue-400 font-bold">{item.quantity}x</span>
                      <span>{item.name}</span>
                      {item.isDigital && (
                        <span className="px-1.5 py-0.2 text-[10px] rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                          Numérique
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-slate-300">
                      {formatCFA(item.total || item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {amount > 0 && (
                <div className="flex items-center justify-between text-xs sm:text-sm pt-2.5 border-t border-slate-800/80">
                  <span className="text-slate-300 font-bold">Total Réglé Net</span>
                  <span className="font-mono font-black text-emerald-400 text-base">
                    {formatCFA(amount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Règlement certifié</span>
                <span className="font-semibold text-slate-300">Sebpay Hosted Checkout</span>
              </div>
            </div>

            {/* SECTION SPÉCIALE : ACCÈS PRODUITS NUMÉRIQUES & LIENS PRÉ-SIGNÉS */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/60 to-indigo-950/60 border border-blue-500/30 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white">
                      Vos Accès Produits Numériques
                    </h4>
                    <p className="text-[11px] text-blue-200">
                      Lien pré-signé sécurisé Cloudflare R2 • Expire dans 1 heure (3600s)
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <a
                  href={`/download/${orderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition hover:scale-[1.01]"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger Directement</span>
                </a>

                <a
                  href="/client/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition hover:scale-[1.01]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Mon Espace Client</span>
                </a>
              </div>
            </div>

            {/* BOUTONS D'EXPÉDITION DIRECTE DU REÇU AU CLIENT */}
            <div className="space-y-2.5 pt-1">
              <a
                href={getDigitalReceiptWhatsAppUrl(receiptPayload)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <MessageCircle className="w-4.5 h-4.5 fill-current" />
                <span>Recevoir mon Reçu & Liens sur WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => downloadDigitalReceiptPdf(receiptPayload, 'a4')}
                className="w-full py-3 px-4 rounded-xl border border-slate-700 hover:bg-slate-800/80 text-slate-200 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Télécharger le Reçu Officiel (PDF A4)</span>
              </button>

              <button
                type="button"
                onClick={handleReturn}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Retourner à la boutique</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
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
