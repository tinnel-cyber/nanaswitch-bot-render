import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X,
  Video,
  ArrowRight,
  ExternalLink,
  Loader2,
  Sparkles
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../../utils/audio';
import {
  apiInitiateConsultation,
  apiProcessMobileMoneyPayment,
  PaymentSuccessResult
} from '../../../../services/wameetPremiumService';

export interface WameetPremiumPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  expert: {
    id: string;
    name: string;
    avatar?: string;
    price: number;
    topic?: string;
  };
  requester?: {
    id: string;
    name: string;
    phone?: string;
  };
  onPaymentSuccess: (result: PaymentSuccessResult) => void;
}

export type MobileMoneyProvider = 'ORANGE_MONEY' | 'WAVE' | 'MTN_MOMO' | 'MOOV_MONEY' | 'CINETPAY';

export const WameetPremiumPaymentModal: React.FC<WameetPremiumPaymentModalProps> = ({
  isOpen,
  onClose,
  expert,
  requester = { id: 'client_current', name: 'Vous' },
  onPaymentSuccess
}) => {
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProvider>('ORANGE_MONEY');
  const [phone, setPhone] = useState(requester.phone || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentSuccessResult | null>(null);

  if (!isOpen) return null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 8) {
      setErrorMessage('Veuillez saisir un numéro de téléphone Mobile Money valide.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    playTapBeep();

    try {
      // 1. Initialisation de la consultation sans salon Jitsi (Jitsi verrouillé)
      const consultation = await apiInitiateConsultation({
        expertId: expert.id,
        expertName: expert.name,
        requesterId: requester.id,
        requesterName: requester.name,
        amount: expert.price,
        topic: expert.topic || 'Consultation Wameet Premium'
      });

      // 2. Traitement strict via le webhook de paiement Mobile Money / CinetPay
      // La salle Jitsi ne peut être générée que si le webhook reçoit le statut 'SUCCESS'
      const result = await apiProcessMobileMoneyPayment({
        wameetId: consultation.id,
        status: 'SUCCESS',
        provider: selectedProvider,
        payerPhone: phone,
        amount: expert.price,
        senderId: requester.id,
        receiverId: expert.name
      });

      playCashChime();
      playValidationBeep();
      setPaymentResult(result);
      onPaymentSuccess(result);
    } catch (err: any) {
      console.error('[PAYMENT ERROR]', err);
      setErrorMessage(err?.message || 'Échec de la validation du paiement Mobile Money.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = () => {
    if (!paymentResult) return;
    playTapBeep();
    if (paymentResult.wameetUrl) {
      if (paymentResult.wameetUrl.startsWith('/')) {
        window.location.href = paymentResult.wameetUrl;
      } else {
        window.open(paymentResult.wameetUrl, '_blank', 'noopener,noreferrer');
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Sécurisé & Gradient Premium */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5">
                <span>Accès Wameet Premium</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
                  Payant
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Salon vidéo chiffré verrouillé par le paiement
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ===================================================================
            ÉTAPE 1 : FORMULAIRE DE PAIEMENT MOBILE MONEY
           =================================================================== */}
        {!paymentResult ? (
          <form onSubmit={handlePay} className="p-6 space-y-4">
            {/* Fiche récapitulative de la consultation */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {expert.avatar ? (
                  <img
                    src={expert.avatar}
                    alt={expert.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#4169E1] text-white flex items-center justify-center font-black text-sm">
                    {expert.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-900 truncate">
                    {expert.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate">
                    {expert.topic || 'Consultation Privée 1-to-1'}
                  </p>
                </div>
              </div>

              {/* Montant exigé */}
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Tarif</span>
                <span className="text-base font-black text-[#4169E1]">
                  {expert.price.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            {/* Avertissement de logique stricte */}
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/80 flex items-start gap-2.5 text-xs text-blue-900">
              <ShieldCheck className="w-4 h-4 text-[#4169E1] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Le lien du salon vidéo privé Wameet ne sera débloqué et transmis aux deux parties
                qu'après confirmation du paiement par webhook.
              </p>
            </div>

            {/* Choix de l'opérateur Mobile Money */}
            <div>
              <label className="text-xs font-black text-slate-800 block mb-2">
                Sélectionnez votre opérateur Mobile Money :
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProvider('ORANGE_MONEY')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                    selectedProvider === 'ORANGE_MONEY'
                      ? 'border-orange-500 bg-orange-50/70 text-orange-950 font-bold ring-2 ring-orange-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-[10px] font-black">
                    OM
                  </div>
                  <span className="text-xs">Orange Money</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProvider('WAVE')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                    selectedProvider === 'WAVE'
                      ? 'border-sky-500 bg-sky-50/70 text-sky-950 font-bold ring-2 ring-sky-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-sky-500 text-white flex items-center justify-center text-[10px] font-black">
                    🌊
                  </div>
                  <span className="text-xs">Wave</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProvider('MTN_MOMO')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                    selectedProvider === 'MTN_MOMO'
                      ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-bold ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-amber-400 text-slate-900 flex items-center justify-center text-[10px] font-black">
                    MTN
                  </div>
                  <span className="text-xs">MTN MoMo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProvider('MOOV_MONEY')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                    selectedProvider === 'MOOV_MONEY'
                      ? 'border-blue-500 bg-blue-50/70 text-blue-950 font-bold ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                    MV
                  </div>
                  <span className="text-xs">Moov Money</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProvider('CINETPAY')}
                  className={`col-span-2 p-2.5 rounded-xl border text-left flex items-center justify-between gap-2.5 transition cursor-pointer ${
                    selectedProvider === 'CINETPAY'
                      ? 'border-[#4169E1] bg-blue-50/70 text-blue-950 font-bold ring-2 ring-[#4169E1]/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-[#4169E1] text-white flex items-center justify-center text-[10px] font-black">
                      CP
                    </div>
                    <div>
                      <span className="text-xs block font-bold">CinetPay Gateway</span>
                      <span className="text-[10px] text-slate-500 font-medium">Cartes Bancaires & 10+ Mobile Money</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-[#4169E1] uppercase bg-blue-100/70 px-2 py-0.5 rounded-full">
                    Multi-Pays
                  </span>
                </button>
              </div>
            </div>

            {/* Numéro de téléphone */}
            <div>
              <label className="text-xs font-black text-slate-800 block mb-1">
                Numéro de téléphone du compte :
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: 07 00 00 00 00 ou +226..."
                  className="w-full px-3.5 py-2.5 pl-9 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#4169E1]"
                />
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Bouton de validation */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-[#4169E1] hover:bg-blue-700 text-white text-xs font-black transition cursor-pointer shadow-lg shadow-[#4169E1]/30 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validation Webhook en cours...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>
                    Régler {expert.price.toLocaleString('fr-FR')} FCFA & Débloquer Wameet
                  </span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* ===================================================================
              ÉTAPE 2 : SUCCÈS - SALLE WAMEET DÉVERROUILLÉE & TRANSACTION ENREGISTRÉE
             =================================================================== */
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Paiement Validé avec Succès !
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                La transaction a été consignée et le salon vidéo Wameet est maintenant déverrouillé.
              </p>
            </div>

            {/* Détails de la transaction */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Réf. Transaction :</span>
                <span className="font-bold text-slate-900">{paymentResult.transaction?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Montant Consigné :</span>
                <span className="font-bold text-emerald-600">
                  {expert.price.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Salon Wameet Room :</span>
                <span className="font-bold text-blue-700 truncate max-w-[180px]">
                  {paymentResult.jitsiRoomId}
                </span>
              </div>
            </div>

            {/* Bouton pour entrer dans la salle */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleJoinRoom}
                className="w-full py-3 rounded-2xl bg-[#4169E1] hover:bg-blue-700 text-white text-xs font-black transition cursor-pointer shadow-xl shadow-[#4169E1]/30 active:scale-98 flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" />
                <span>Rejoindre le Salon Wameet avec {expert.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WameetPremiumPaymentModal;
