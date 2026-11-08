import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckCircle2, 
  Smartphone, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  RefreshCw, 
  Lock, 
  ExternalLink,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCashChime, playCancelSound, formatCFA } from '../../../utils/audio';
import { supabase } from '@/lib/supabase';
import { db } from '../../../firebase';
import { 
  initiateSPayment, 
  verifySPayment,
  SCollectionResponse
} from '../../../services/paymentApiService';
import { getOperatorLogo } from '../../../utils/operatorLogos';
import { ALL_20_COUNTRIES_CONFIG, detectCountryFromPhone, getDynamicFailoverNotice } from '../../../utils/countryPaymentConfig';

// =============================================================================
// TYPES & CONTRATS OFFICIELS S-PAY
// =============================================================================

export interface SellerPaymentConfig {
  enabledMethods?: string[];
  operatorNumbers?: {
    orange_money?: string;
    moov_money?: string;
    wave?: string;
    mtn_momo?: string;
    [key: string]: string | undefined;
  };
  wavePaymentLink?: string;
}

export function getEffectiveSellerPaymentConfig(rawConfig?: any): SellerPaymentConfig {
  return {
    enabledMethods: rawConfig?.enabledMethods || ['orange_money', 'moov_money', 'wave', 'mtn_momo'],
    operatorNumbers: rawConfig?.operatorNumbers || {},
    wavePaymentLink: rawConfig?.wavePaymentLink || ''
  };
}

export interface PaymentSuccessDetails {
  transactionId: string;
  amount: number;
  currency: string;
  country?: any;
  operator?: any;
  phoneNumber?: string;
  timestamp?: number;
  status?: string;
  paymentMethod?: string;
  deliveryAddress?: string;
}

export interface SPaymentGatewayProps {
  isModal?: boolean;
  productType?: 'physical' | 'digital' | 'subscription';
  amount: number;
  currency?: string;
  orderDescription?: string;
  orderId: string;
  defaultPhone?: string;
  defaultAddress?: string;
  sellerConfig?: any;
  onSuccess: (details: PaymentSuccessDetails) => void;
  onCancel?: () => void;
}

export interface SCountryOption {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  currency: string;
  operators: {
    id: string;
    name: string;
    code: string;
    needsOtp?: boolean;
    brandColor?: string;
  }[];
}

// Catalogue complet des 20 pays certifiés Sebpay
export const S_COUNTRIES: SCountryOption[] = ALL_20_COUNTRIES_CONFIG as unknown as SCountryOption[];

export const SPaymentGateway: React.FC<SPaymentGatewayProps> = ({
  isModal = false,
  productType = 'subscription',
  amount,
  currency = 'FCFA',
  orderDescription = 'Paiement sécurisé S-Pay',
  orderId,
  defaultPhone = '',
  defaultAddress = '',
  onSuccess,
  onCancel
}) => {
  // 1. Détection initiale du pays
  const [selectedCountry, setSelectedCountry] = useState<SCountryOption>(() => {
    return S_COUNTRIES[0];
  });

  // 2. Opérateur sélectionné
  const [selectedOperator, setSelectedOperator] = useState(() => selectedCountry.operators[0]);

  // 3. Téléphone client
  const [phone, setPhone] = useState(() => {
    const clean = (defaultPhone || '').replace(/\s+/g, '');
    return clean;
  });

  // 4. Code OTP (Orange Money)
  const [otpCode, setOtpCode] = useState('');

  // 5. État du tunnel
  const [status, setStatus] = useState<'IDLE' | 'INITIATING' | 'AWAITING_WEBHOOK' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sResponse, setSResponse] = useState<SCollectionResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [failoverAlert, setFailoverAlert] = useState<{ active: boolean; url: string; message?: string } | null>(null);

  // Synchroniser l'opérateur par défaut lors du changement de pays
  const handleCountryChange = (c: SCountryOption) => {
    setSelectedCountry(c);
    setSelectedOperator(c.operators[0]);
    playTapBeep();
  };

  // 6. Écouteur Supabase Realtime 100% Automatique via Webhook
  useEffect(() => {
    if (!orderId || status === 'SUCCESS') return;

    let channel: any = null;
    try {
      const channelName = `spay_intent_${orderId}_${Math.random().toString(36).substring(7)}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sales',
            filter: `id=eq.${orderId}`,
          },
          (payload) => {
            if (payload.new) {
              const data = payload.new as any;
              const isPaid = 
                data?.isPaid === true || 
                data?.paid === true || 
                ['COMPLETED', 'PAID', 'SUCCESS'].includes(String(data?.status || '').toUpperCase()) ||
                ['COMPLETED', 'PAID'].includes(String(data?.payment_status || '').toUpperCase());

              if (isPaid && status !== 'SUCCESS') {
                console.log('[S WEBHOOK DETECTED] Paiement validé par le Webhook Supabase !', data);
                playCashChime();
                setStatus('SUCCESS');
                onSuccess({
                  transactionId: data?.transaction_id || data?.id || orderId,
                  amount,
                  currency,
                  country: selectedCountry,
                  operator: selectedOperator,
                  phoneNumber: phone,
                  timestamp: Date.now(),
                  status: 'COMPLETED',
                  paymentMethod: selectedOperator.name
                });
              } else {
                const isFailedOrCancelled =
                  ['FAILED', 'CANCELLED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(String(data?.status || '').toUpperCase()) ||
                  ['FAILED', 'CANCELLED', 'CANCELED'].includes(String(data?.payment_status || '').toUpperCase());

                if (isFailedOrCancelled && status === 'AWAITING_WEBHOOK') {
                  const isCanc = String(data?.status || '').toUpperCase().includes('CANCEL');
                  setStatus('ERROR');
                  setErrorMessage(
                    isCanc
                      ? 'Paiement annulé par l\'opérateur ou l\'utilisateur.'
                      : (data?.error || 'Paiement non abouti. Veuillez vérifier votre solde Mobile Money.')
                  );
                  playCancelSound();
                }
              }
            }
          }
        )
        .subscribe();
    } catch (err: any) {
      console.warn('[REALTIME LISTENER ERROR]', err.message);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [orderId, status, amount, currency, selectedCountry, selectedOperator, phone, onSuccess]);

  // Si l'opérateur change, réinitialiser le champ OTP
  useEffect(() => {
    setOtpCode('');
  }, [selectedOperator]);

  // 7. Déclenchement automatique de la collection S
  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 8) {
      setErrorMessage('Veuillez saisir un numéro de téléphone Mobile Money valide.');
      playCancelSound();
      return;
    }

    if (selectedOperator.needsOtp && (!otpCode || otpCode.trim().length < 4)) {
      setErrorMessage('Le code d\'autorisation temporaire (OTP) Orange Money est requis.');
      playCancelSound();
      return;
    }

    setErrorMessage(null);
    setStatus('INITIATING');
    playTapBeep();

    try {
      const formattedPhone = phone.trim();
      const shopName = sellerConfig?.shopName || sellerConfig?.storeName || sellerConfig?.name || 'nanasore';
      const res = await initiateSPayment({
        orderId,
        shopName,
        storeName: shopName,
        amount,
        currency: 'XOF',
        phone: formattedPhone,
        customerPhone: formattedPhone,
        operator: selectedOperator.code || selectedOperator.id,
        provider: selectedOperator.code || selectedOperator.id,
        otpCode: selectedOperator.needsOtp ? otpCode.trim() : undefined,
        description: orderDescription
      });

      if (!res.success && res.error) {
        setStatus('ERROR');
        setErrorMessage(res.error || 'Erreur lors de l\'initiation S.');
        playCancelSound();
        return;
      }

      setSResponse(res);
      setStatus('AWAITING_WEBHOOK');
      playValidationBeep();

      // Si renvoie un lien de redirection externe (LigdiCash, Wave ou Passerelle Web)
      const redirectLink = res.provider_link || res.redirectUrl || res.checkout_url || (res as any).paymentUrl;
      if (redirectLink && typeof window !== 'undefined') {
        if (res.failover) {
          const failoverMsg = res.message || getDynamicFailoverNotice(selectedOperator, selectedCountry);
          setFailoverAlert({
            active: true,
            url: redirectLink,
            message: failoverMsg
          });
          setTimeout(() => {
            window.location.href = redirectLink;
          }, 1800);
          return;
        }
        window.location.href = redirectLink;
        return;
      }
    } catch (err: any) {
      setStatus('ERROR');
      setErrorMessage(err.message || 'Impossible de joindre la passerelle S.');
      playCancelSound();
    }
  };

  // 8. Bouton de vérification de secours (si le WebSocket tarde)
  const handleManualCheck = async () => {
    setIsVerifying(true);
    playTapBeep();
    try {
      const verifyRes = await verifySPayment(orderId);
      if (verifyRes.success || verifyRes.isPaid) {
        playCashChime();
        setStatus('SUCCESS');
        onSuccess({
          transactionId: verifyRes.data?.transaction_id || orderId,
          amount,
          currency,
          country: selectedCountry,
          operator: selectedOperator,
          phoneNumber: phone,
          timestamp: Date.now(),
          status: 'COMPLETED',
          paymentMethod: selectedOperator.name
        });
      } else {
        setErrorMessage('Paiement toujours en cours de validation. Veuillez vérifier sur votre téléphone.');
      }
    } catch (err: any) {
      setErrorMessage('Vérification en cours : ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const containerContent = (
    <div className="w-full max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-100 space-y-6">
      {/* En-tête officiel S-Pay */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
              Passerelle Sécurisée S-Pay
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                100% Automatique
              </span>
            </h3>
            <p className="text-xs text-slate-400">{orderDescription}</p>
          </div>
        </div>

        {onCancel && status !== 'SUCCESS' && (
          <button
            type="button"
            onClick={() => { playCancelSound(); onCancel(); }}
            className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            Fermer
          </button>
        )}
      </div>

      {/* Recap du montant */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/30 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Total à régler</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
            {formatCFA(amount)}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-slate-400 block">Réf : {orderId.slice(0, 10)}...</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <Lock className="w-3 h-3" /> Chiffré SSL 256-bit
          </span>
        </div>
      </div>

      {/* VUE 1 : Formulaire de Saisie Téléphone & Opérateur */}
      {(status === 'IDLE' || status === 'ERROR') && (
        <form onSubmit={handleInitiatePayment} className="space-y-5">
          {/* Sélection du Pays */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              1. Sélectionnez votre pays
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
              {S_COUNTRIES.map((c) => (
                <button
                  type="button"
                  key={c.code}
                  onClick={() => handleCountryChange(c)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-left whitespace-nowrap transition cursor-pointer shrink-0 ${
                    selectedCountry.code === c.code
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-lg">{c.flag}</span>
                  <span className="text-xs font-bold">{c.name} ({c.dialCode})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sélection de l'Opérateur */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              2. Choisissez votre moyen de paiement
            </label>
            <div className="grid grid-cols-2 gap-2">
              {selectedCountry.operators.map((op) => {
                const isSelected = selectedOperator.id === op.id;
                const logoUrl = getOperatorLogo(op.id);
                return (
                  <button
                    type="button"
                    key={op.id}
                    onClick={() => { setSelectedOperator(op); playTapBeep(); }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/50 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt={op.name} className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5" />
                    ) : (
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs text-white"
                        style={{ backgroundColor: op.brandColor || '#10b981' }}
                      >
                        {op.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate text-white">{op.name}</div>
                      <div className="text-[10px] text-slate-400">Mobile Money</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saisie du Numéro de téléphone */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>3. Numéro de compte ({selectedCountry.dialCode})</span>
              <span className="text-[11px] text-slate-500 normal-case font-normal">Sans le préfixe pays</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono text-sm">
                <span className="mr-1">{selectedCountry.flag}</span>
                <span>{selectedCountry.dialCode}</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  setPhone(val);
                  const detected = detectCountryFromPhone(val);
                  if (detected && detected.code !== selectedCountry.code) {
                    const found = S_COUNTRIES.find(c => c.code === detected.code);
                    if (found) {
                      handleCountryChange(found);
                    }
                  }
                }}
                placeholder="Ex: 70 12 34 56 ou +225..."
                className="w-full pl-24 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-white font-mono text-base tracking-wide transition outline-none"
                required
              />
            </div>
          </div>

          {/* Code d'autorisation OTP si Orange Money */}
          {selectedOperator.needsOtp && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2.5 text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Code d'autorisation requis :</strong> Veuillez composer <strong>#144*77#</strong> (ou #144#) sur votre téléphone pour générer votre code OTP Orange Money.
                </div>
              </div>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="Entrez le code OTP à 4 ou 6 chiffres"
                maxLength={8}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-200 font-mono text-center text-lg tracking-widest outline-none focus:border-amber-400"
                required
              />
            </div>
          )}

          {/* Message d'erreur */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Bouton de Soumission */}
          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition active:scale-[0.99] cursor-pointer"
          >
            <span>Payer {formatCFA(amount)}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      )}

      {/* VUE 2 : En cours d'initiation API */}
      {status === 'INITIATING' && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <div className="space-y-1">
            <h4 className="font-bold text-white text-base">Connexion à la passerelle S-Pay...</h4>
            <p className="text-xs text-slate-400">Émission de l'ordre de débit sur votre compte Mobile Money.</p>
          </div>
        </div>
      )}

      {/* VUE 3 : En attente du Webhook (Push USSD ou Redirection Wave) */}
      {status === 'AWAITING_WEBHOOK' && (
        <div className="py-8 space-y-6 text-center">
          {/* Animation d'attente de validation */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-9 h-9 animate-bounce" />
            </div>
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h4 className="font-extrabold text-white text-base sm:text-lg">
              Validation requise sur votre téléphone
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Une demande de débit de <strong className="text-emerald-400 font-mono">{formatCFA(amount)}</strong> a été envoyée au numéro <strong className="font-mono text-white">{phone}</strong> via <strong className="text-white">{selectedOperator.name}</strong>.
            </p>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p>👉 <strong>Veuillez composer votre code secret Mobile Money</strong> sur votre écran pour autoriser la transaction.</p>
              <p className="text-emerald-400 font-medium">✓ Dès confirmation, cette page se validera automatiquement sans aucune action de votre part.</p>
            </div>
          </div>

          {/* Si Wave / Provider Link spécifique */}
          {sResponse?.provider_link && (
            <div className="pt-2">
              <a
                href={sResponse.provider_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition active:scale-95"
              >
                <span>Ouvrir l'application {selectedOperator.name}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Bouton de secours : Vérifier maintenant */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={isVerifying}
              onClick={handleManualCheck}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>J'ai déjà validé sur mon téléphone</span>
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={() => { playTapBeep(); onCancel(); }}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-300 text-xs font-medium cursor-pointer"
              >
                Annuler
              </button>
            )}
          </div>
        </div>
      )}

      {/* VUE 4 : Succès instantané */}
      {status === 'SUCCESS' && (
        <div className="py-10 text-center space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-white text-lg">Paiement validé avec succès !</h4>
            <p className="text-xs text-emerald-400">Confirmation automatique reçue via le Webhook S.</p>
          </div>
        </div>
      )}
      {/* Modale d'Information Transparente lors d'un Failover vers Sebpay */}
      {failoverAlert?.active && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="max-w-md w-full p-6 sm:p-7 rounded-3xl bg-slate-900 border-2 border-amber-500/50 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-300">
                <span>Passerelle de secours activée</span>
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Canal direct temporairement indisponible
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {failoverAlert?.message || getDynamicFailoverNotice(selectedOperator, selectedCountry)}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-amber-300">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Redirection automatique en cours...</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-amber-400 h-full animate-[progress_1.8s_ease-in-out_forwards]" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        {containerContent}
      </div>
    );
  }

  return containerContent;
};

export default SPaymentGateway;
