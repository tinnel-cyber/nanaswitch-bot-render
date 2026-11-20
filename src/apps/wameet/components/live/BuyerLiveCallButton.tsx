import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video,
  PhoneOff,
  Loader2,
  AlertCircle,
  ShoppingBag,
  Zap,
  CheckCircle2,
  RefreshCw,
  X,
  PhoneCall,
} from 'lucide-react';
import {
  getMonthlyLiveCallsCount,
  incrementMonthlyLiveCallsCount,
  isLimitReached,
  triggerLimitReachedUpsell,
} from '../../../../utils/planFeatures';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';
import {
  createLiveProductCallChannel,
  logLiveProductCallToSupabase,
  updateLiveProductCallStatusInSupabase,
  type LiveProductCallPayload,
} from '../../../../services/liveProductCallService';
import { NativeCoaching1to1Room } from './NativeCoaching1to1Room';
import { UltimateCheckout } from '../../../../components/payment/UltimateCheckout';

export interface BuyerLiveCallButtonProps {
  /** Identifiant du produit ou article en vedette */
  productId?: string;
  /** Nom du produit affiché */
  productName?: string;
  /** Prix du produit (FCFA) pour le bouton "Acheter maintenant" et le Checkout en popup */
  productPrice?: number;
  /** Image miniature du produit affichée pendant l'appel et dans le Checkout */
  productImage?: string;
  /** Nom de la boutique */
  storeName?: string;
  /** Numéro WhatsApp / Wameet de la boutique pour le Checkout */
  whatsappPhone?: string;
  /** Identifiant de l'acheteur (optionnel, généré automatiquement en session sinon) */
  buyerId?: string;
  /** Identifiant du vendeur/boutique cible */
  sellerId?: string;
  /** Libellé personnalisé du bouton (défaut : "Voir en direct") */
  buttonText?: string;
  /** Classes CSS Tailwind additionnelles pour le bouton */
  className?: string;
  /** Callback déclenché dès que l'appel est initié/rejoint */
  onCallJoined?: (roomId: string, requestId: string) => void;
  /** Callback déclenché lorsque l'appel prend fin */
  onCallEnded?: () => void;
  /** Abonnement actuel pour vérification des quotas */
  subscription?: any;
}

type LiveCallState = 'idle' | 'ringing' | 'connected' | 'rejected' | 'no_answer';

const RING_TIMEOUT_SECONDS = 45;

/**
 * Composant Client (Acheteur) : "Voir le produit en direct avant achat"
 * 100 % Natif WebRTC + Supabase Realtime Broadcast (Zéro Firebase, Zéro Daily.co).
 * - Déclenche une sonnerie temps réel sur l'écran du vendeur.
 * - Ouvre la salle vidéo WebRTC native Nanasore dès que le vendeur décroche.
 * - Affiche en bas de l'écran acheteur la carte produit + bouton "Acheter maintenant".
 * - Ouvre UltimateCheckout en popup par-dessus la vidéo sans couper l'appel.
 */
export const BuyerLiveCallButton: React.FC<BuyerLiveCallButtonProps> = ({
  productId,
  productName = 'Article sélectionné',
  productPrice = 0,
  productImage,
  storeName = 'Boutique Nanasore',
  whatsappPhone = '',
  buyerId: customBuyerId,
  sellerId,
  buttonText = 'Voir en direct',
  className = '',
  onCallJoined,
  onCallEnded,
  subscription,
}) => {
  const [callState, setCallState] = useState<LiveCallState>('idle');
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [ringSeconds, setRingSeconds] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [orderCompleted, setOrderCompleted] = useState<boolean>(false);

  const channelHandleRef = useRef<ReturnType<typeof createLiveProductCallChannel> | null>(null);
  const ringPingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringClockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);

  const getEffectiveBuyerId = useCallback((): string => {
    if (customBuyerId && customBuyerId.trim()) return customBuyerId.trim();
    const sessionKey = 'nana_buyer_anon_id';
    let storedId = sessionStorage.getItem(sessionKey);
    if (!storedId) {
      storedId = `buyer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem(sessionKey, storedId);
    }
    return storedId;
  }, [customBuyerId]);

  const clearTimers = useCallback(() => {
    if (ringPingIntervalRef.current) {
      clearInterval(ringPingIntervalRef.current);
      ringPingIntervalRef.current = null;
    }
    if (ringClockIntervalRef.current) {
      clearInterval(ringClockIntervalRef.current);
      ringClockIntervalRef.current = null;
    }
  }, []);

  const cleanupChannel = useCallback(() => {
    clearTimers();
    if (channelHandleRef.current) {
      channelHandleRef.current.cleanup();
      channelHandleRef.current = null;
    }
  }, [clearTimers]);

  useEffect(() => {
    return () => {
      cleanupChannel();
    };
  }, [cleanupChannel]);

  const handleHangUp = useCallback(
    async (notifySeller = true) => {
      const reqId = activeRequestIdRef.current;
      clearTimers();

      if (notifySeller && reqId) {
        try {
          await channelHandleRef.current?.sendCallEnded({
            requestId: reqId,
            endedBy: 'buyer',
            timestamp: Date.now(),
          });
        } catch {
          // ignore
        }
        updateLiveProductCallStatusInSupabase(reqId, 'completed');
      }

      cleanupChannel();
      activeRequestIdRef.current = null;
      setActiveRequestId(null);
      setActiveRoomId(null);
      setCallState('idle');
      setRingSeconds(0);
      setIsCheckoutOpen(false);
      setOrderCompleted(false);
      onCallEnded?.();
    },
    [clearTimers, cleanupChannel, onCallEnded]
  );

  const handleStartLiveCall = async () => {
    if (callState !== 'idle') return;
    playTapBeep();

    const currentCalls = getMonthlyLiveCallsCount(sellerId);
    if (isLimitReached(subscription, 'LIVE_CALLS', currentCalls)) {
      triggerLimitReachedUpsell('LIVE_CALLS', currentCalls, 3, 'appels en direct ce mois-ci');
      return;
    }

    setErrorMessage(null);
    setOrderCompleted(false);
    setRingSeconds(0);

    try {
      const effectiveBuyerId = getEffectiveBuyerId();
      const cleanProdId = (productId || 'article').replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 24);
      const requestId = `livecall_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const roomId = `prod-${cleanProdId}-${Date.now().toString(36)}`;

      const payload: LiveProductCallPayload = {
        requestId,
        roomId,
        sellerId: sellerId || 'merchant-direct',
        buyerId: effectiveBuyerId,
        buyerName: 'Client Boutique',
        productId: productId || cleanProdId,
        productName,
        productPrice: Number(productPrice) || 0,
        productImage: productImage || '',
        storeName,
        createdAt: Date.now(),
      };

      activeRequestIdRef.current = requestId;
      setActiveRequestId(requestId);
      setActiveRoomId(roomId);
      setCallState('ringing');

      cleanupChannel();
      const handle = createLiveProductCallChannel({
        onCallAccepted: (evt) => {
          if (evt.requestId !== requestId) return;
          clearTimers();
          playValidationBeep();
          setCallState('connected');
          onCallJoined?.(evt.roomId || roomId, requestId);
        },
        onCallRejected: (evt) => {
          if (evt.requestId !== requestId) return;
          clearTimers();
          setCallState('rejected');
        },
        onCallEnded: (evt) => {
          if (evt.requestId !== requestId) return;
          if (evt.endedBy === 'seller') {
            handleHangUp(false);
          }
        },
      });
      channelHandleRef.current = handle;

      // Émission initiale + relance toutes les 3s pendant la sonnerie (jusqu'à 45s)
      await handle.sendIncomingCall(payload);
      logLiveProductCallToSupabase(payload, 'ringing');
      incrementMonthlyLiveCallsCount(sellerId);

      ringPingIntervalRef.current = setInterval(() => {
        if (activeRequestIdRef.current === requestId) {
          handle.sendIncomingCall(payload);
        }
      }, 3000);

      ringClockIntervalRef.current = setInterval(() => {
        setRingSeconds((prev) => {
          const next = prev + 1;
          if (next >= RING_TIMEOUT_SECONDS) {
            clearTimers();
            handle.sendCallEnded({
              requestId,
              endedBy: 'buyer',
              reason: 'timeout',
              timestamp: Date.now(),
            });
            updateLiveProductCallStatusInSupabase(requestId, 'completed');
            setCallState('no_answer');
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      console.error('[BUYER LIVE CALL ERROR]', err);
      cleanupChannel();
      setCallState('idle');
      setErrorMessage(err?.message || "Impossible de lancer l'appel en direct. Veuillez réessayer.");
    }
  };

  const formattedPrice = productPrice > 0 ? formatCFA(productPrice) : '';

  return (
    <div className="w-full">
      {/* =====================================================================
          1. BOUTON "VOIR EN DIRECT" SUR LA FICHE PRODUIT
         ===================================================================== */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleStartLiveCall}
          disabled={callState !== 'idle'}
          className={
            className ||
            'relative group overflow-hidden w-full py-3.5 px-5 rounded-2xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2.5 shadow-xl select-none cursor-pointer bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white active:scale-[0.98] border border-white/20'
          }
          title="Appeler le vendeur en vidéo en direct pour voir le produit avant achat"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <Video className="w-4 h-4 shrink-0" />
          <span className="truncate">{buttonText}</span>
        </button>

        {errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-rose-950/70 border border-rose-500/50 rounded-xl text-rose-200 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="ml-2 font-bold underline hover:text-white cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          2. ÉCRAN DE SONNERIE / ATTENTE DU VENDEUR (OU REFUS / SANS RÉPONSE)
         ===================================================================== */}
      {(callState === 'ringing' || callState === 'rejected' || callState === 'no_answer') && (
        <div className="fixed inset-0 z-[9998] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-5 text-white animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-5">
            {/* Miniature du produit */}
            <div className="relative">
              {callState === 'ringing' && (
                <>
                  <span className="absolute -inset-3 rounded-3xl border-2 border-emerald-500/40 animate-ping pointer-events-none" />
                  <span className="absolute -inset-1.5 rounded-3xl border border-emerald-400/50 animate-pulse pointer-events-none" />
                </>
              )}
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-800 border-2 border-slate-700 flex items-center justify-center shadow-xl">
                {productImage ? (
                  <img
                    src={productImage}
                    alt={productName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="w-10 h-10 text-emerald-400" />
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-bold text-emerald-400">
                {callState === 'ringing' ? (
                  <>
                    <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
                    <span>Appel Live en cours… 00:{String(ringSeconds).padStart(2, '0')}</span>
                  </>
                ) : callState === 'rejected' ? (
                  <span className="text-amber-400">Vendeur occupé</span>
                ) : (
                  <span className="text-amber-400">Aucune réponse</span>
                )}
              </div>

              <h3 className="text-base font-black text-white line-clamp-2">{productName}</h3>
              {formattedPrice && (
                <p className="text-sm font-black text-emerald-400">{formattedPrice}</p>
              )}

              <p className="text-xs text-slate-400 pt-1">
                {callState === 'ringing'
                  ? `Nous prévenons ${storeName} en temps réel. La vidéo s'ouvrira dès que le vendeur décroche.`
                  : callState === 'rejected'
                  ? 'Le vendeur est momentanément indisponible. Vous pouvez réessayer ou commander directement.'
                  : "Le vendeur n'a pas pu décrocher dans le délai imparti. Vous pouvez réessayer ou commander directement."}
              </p>
            </div>

            {callState === 'ringing' ? (
              <button
                type="button"
                onClick={() => handleHangUp(true)}
                className="w-full py-3.5 px-5 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Annuler l&apos;appel</span>
              </button>
            ) : (
              <div className="w-full flex flex-col gap-2.5">
                {productPrice > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>Acheter maintenant</span>
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleHangUp(false);
                      setTimeout(() => handleStartLiveCall(), 80);
                    }}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Réessayer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHangUp(false)}
                    className="py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Fermer</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          3. SALLE VIDÉO LIVE NATIVE WEBRTC + CARTE FLOTTANTE "ACHETER MAINTENANT"
         ===================================================================== */}
      {callState === 'connected' && activeRoomId && (
        <div className="fixed inset-0 z-[9998] bg-slate-950 flex flex-col animate-in fade-in duration-200">
          {/* Salle Visio Native WebRTC Nanasore (Zéro iframe, Zéro Daily.co) */}
          <div className="flex-1 min-h-0 relative">
            <NativeCoaching1to1Room
              roomId={activeRoomId}
              storeSlug={sellerId || 'boutique'}
              storeName={`${storeName} • Live Produit`}
              isHost={false}
              onCallEnded={() => handleHangUp(true)}
            />

            {/* Carte Produit Flottante + Bouton "Acheter maintenant" (au-dessus de la barre vidéo) */}
            <div className="fixed bottom-24 left-3 right-3 sm:left-auto sm:right-5 sm:w-96 z-[9999] pointer-events-auto">
              <div className="bg-slate-950/90 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-black/70 flex items-center gap-3">
                {/* Miniature produit */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-slate-800 border border-white/10 shrink-0 flex items-center justify-center">
                  {productImage ? (
                    <img
                      src={productImage}
                      alt={productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ShoppingBag className="w-6 h-6 text-emerald-400" />
                  )}
                </div>

                {/* Nom + Prix */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      En direct
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-black text-white truncate">
                    {productName}
                  </p>
                  {formattedPrice && (
                    <p className="text-xs font-black text-amber-400">
                      {formattedPrice}
                    </p>
                  )}
                </div>

                {/* CTA Acheter maintenant -> ouvre UltimateCheckout en popup */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setIsCheckoutOpen(true);
                  }}
                  className={`shrink-0 py-2.5 px-3.5 sm:px-4 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer ${
                    orderCompleted
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-amber-950/40'
                  }`}
                >
                  {orderCompleted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Commandé</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                      <span>Acheter</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. POPUP CHECKOUT (ULTIMATE CHECKOUT) SANS COUPER L'APPEL VIDÉO
         ===================================================================== */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[10000]">
          <UltimateCheckout
            isModal={true}
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            onCancel={() => setIsCheckoutOpen(false)}
            product={{
              id: productId || activeRequestId || 'live-product',
              name: productName,
              price: Number(productPrice) || 0,
              imageUrl: productImage,
              quantity: 1,
            }}
            amount={Number(productPrice) || 0}
            storeName={storeName}
            whatsappPhone={whatsappPhone}
            merchantId={sellerId}
            onSuccess={() => {
              playValidationBeep();
              setOrderCompleted(true);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default BuyerLiveCallButton;
