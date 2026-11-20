import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PhoneCall,
  PhoneOff,
  Video,
  ShoppingBag,
  ShieldCheck,
} from 'lucide-react';
import { playIncomingCallRingtone } from '../../../../services/flashLiveService';
import { formatCFA } from '../../../../utils/audio';
import {
  createLiveProductCallChannel,
  isCallForMerchant,
  updateLiveProductCallStatusInSupabase,
  type LiveProductCallPayload,
} from '../../../../services/liveProductCallService';
import { NativeCoaching1to1Room } from './NativeCoaching1to1Room';

export interface LiveIncomingCallAlertProps {
  /** Filtrer par identifiant de commerçant / boutique (optionnel) */
  merchantId?: string;
  /** Nom de la boutique (optionnel) */
  storeName?: string;
}

/**
 * Composant Récepteur Vendeur (Dashboard / Téléphone ou Ordinateur Vendeur)
 * 100 % Supabase Realtime Broadcast + Salle WebRTC Native Nanasore (Zéro Firebase, Zéro Daily.co).
 * - Reçoit en temps réel les demandes d'appel "Voir en direct" des acheteurs.
 * - Déclenche la sonnerie audio et la carte d'appel entrant avec photo, nom et prix du produit.
 * - Au clic sur "Décrocher (Live)", ouvre immédiatement la salle WebRTC native Nanasore
 *   pour présenter le produit au client pendant que celui-ci peut commander en popup.
 */
export const LiveIncomingCallAlert: React.FC<LiveIncomingCallAlertProps> = ({
  merchantId,
  storeName = 'Boutique Nanasore',
}) => {
  const [incomingCall, setIncomingCall] = useState<LiveProductCallPayload | null>(null);
  const [activeCall, setActiveCall] = useState<LiveProductCallPayload | null>(null);

  const ringtoneTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelHandleRef = useRef<ReturnType<typeof createLiveProductCallChannel> | null>(null);
  const activeCallRef = useRef<LiveProductCallPayload | null>(null);
  const incomingCallRef = useRef<LiveProductCallPayload | null>(null);
  const dismissedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  const stopRingtone = useCallback(() => {
    if (ringtoneTimerRef.current) {
      clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
  }, []);

  const startRingtone = useCallback(() => {
    if (!ringtoneTimerRef.current) {
      try {
        playIncomingCallRingtone();
      } catch {
        // Autoplay policy may block before first gesture
      }
      ringtoneTimerRef.current = setInterval(() => {
        try {
          playIncomingCallRingtone();
        } catch {
          // ignore
        }
      }, 3200);
    }
  }, []);

  /**
   * 1. Abonnement Supabase Realtime Broadcast aux appels Live Produit entrants
   */
  useEffect(() => {
    const handle = createLiveProductCallChannel({
      onIncomingCall: (payload) => {
        // Ignorer si déjà refusé/terminé ou si le vendeur est déjà en appel actif
        if (dismissedIdsRef.current.has(payload.requestId)) return;
        if (activeCallRef.current) return;
        if (!isCallForMerchant(payload, merchantId, storeName)) return;

        // Éviter de réinitialiser si c'est une relance de sonnerie du même appel
        if (incomingCallRef.current?.requestId === payload.requestId) return;

        setIncomingCall(payload);
        startRingtone();
      },
      onCallAccepted: (evt) => {
        // Si décroché depuis un autre onglet/appareil du vendeur, couper la sonnerie ici
        if (incomingCallRef.current?.requestId === evt.requestId) {
          dismissedIdsRef.current.add(evt.requestId);
          setIncomingCall(null);
          stopRingtone();
        }
      },
      onCallRejected: (evt) => {
        if (incomingCallRef.current?.requestId === evt.requestId) {
          dismissedIdsRef.current.add(evt.requestId);
          setIncomingCall(null);
          stopRingtone();
        }
      },
      onCallEnded: (evt) => {
        dismissedIdsRef.current.add(evt.requestId);
        if (incomingCallRef.current?.requestId === evt.requestId) {
          setIncomingCall(null);
          stopRingtone();
        }
        if (activeCallRef.current?.requestId === evt.requestId && evt.endedBy === 'buyer') {
          setActiveCall(null);
        }
      },
    });

    channelHandleRef.current = handle;

    return () => {
      handle.cleanup();
      channelHandleRef.current = null;
      stopRingtone();
    };
  }, [merchantId, storeName, startRingtone, stopRingtone]);

  /**
   * 2. Le vendeur décroche l'appel -> signalisation immédiate + ouverture salle WebRTC native
   */
  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    stopRingtone();
    const callToAccept = incomingCall;
    dismissedIdsRef.current.add(callToAccept.requestId);
    setIncomingCall(null);
    setActiveCall(callToAccept);

    await channelHandleRef.current?.sendCallAccepted({
      requestId: callToAccept.requestId,
      roomId: callToAccept.roomId,
      sellerId: merchantId || callToAccept.sellerId,
      sellerName: storeName,
      timestamp: Date.now(),
    });

    updateLiveProductCallStatusInSupabase(callToAccept.requestId, 'connected');
  };

  /**
   * 3. Le vendeur refuse l'appel
   */
  const handleRejectCall = async () => {
    if (!incomingCall) return;

    stopRingtone();
    const reqId = incomingCall.requestId;
    dismissedIdsRef.current.add(reqId);
    setIncomingCall(null);

    await channelHandleRef.current?.sendCallRejected({
      requestId: reqId,
      sellerId: merchantId,
      reason: 'rejected_by_seller',
      timestamp: Date.now(),
    });

    updateLiveProductCallStatusInSupabase(reqId, 'rejected');
  };

  /**
   * 4. Fin d'appel côté vendeur
   */
  const handleEndCall = useCallback(async () => {
    const current = activeCallRef.current;
    setActiveCall(null);

    if (current) {
      dismissedIdsRef.current.add(current.requestId);
      await channelHandleRef.current?.sendCallEnded({
        requestId: current.requestId,
        endedBy: 'seller',
        timestamp: Date.now(),
      });
      updateLiveProductCallStatusInSupabase(current.requestId, 'completed');
    }
  }, []);

  return (
    <>
      {/* =========================================================================
          1. CARTE D'APPEL ENTRANT (SONNERIE SUR L'ÉCRAN DU VENDEUR)
         ========================================================================= */}
      {incomingCall && !activeCall && (
        <div className="fixed top-5 right-5 z-[9999] max-w-md w-[calc(100vw-2.5rem)] sm:w-96 animate-in slide-in-from-top duration-300">
          <div className="bg-slate-900/95 backdrop-blur-2xl border-2 border-emerald-500 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-emerald-950/70 text-slate-100 flex flex-col gap-3 relative overflow-hidden">
            {/* Halo vert pulsant */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl animate-pulse pointer-events-none" />

            {/* En-tête de l'appel entrant */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-emerald-400 animate-bounce" />
                  <span>Appel Live Produit Entrant !</span>
                </span>
              </div>

              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                WebRTC Natif
              </span>
            </div>

            {/* Détails du produit demandé par l'acheteur */}
            <div className="flex items-center gap-3 bg-slate-950/90 p-3 rounded-2xl border border-slate-800">
              <div className="w-14 h-14 rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center text-emerald-400 shrink-0 border border-slate-700">
                {incomingCall.productImage ? (
                  <img
                    src={incomingCall.productImage}
                    alt={incomingCall.productName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-black text-white truncate">
                  {incomingCall.productName || 'Article en boutique'}
                </h4>
                {incomingCall.productPrice > 0 && (
                  <p className="text-xs font-black text-amber-400 mt-0.5">
                    {formatCFA(incomingCall.productPrice)}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  Un client souhaite voir cet article en direct avant d&apos;acheter !
                </p>
              </div>
            </div>

            {/* Boutons d'action vendeur */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleRejectCall}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Refuser</span>
              </button>

              <button
                type="button"
                onClick={handleAcceptCall}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50"
              >
                <Video className="w-4 h-4" />
                <span>Décrocher (Live)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. SALLE VIDÉO NATIVE WEBRTC ACTIVE CÔTÉ VENDEUR
         ========================================================================= */}
      {activeCall && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl h-[92vh] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
            {/* Header Vendeur avec info produit */}
            <div className="px-4 sm:px-5 py-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {activeCall.productImage && (
                  <img
                    src={activeCall.productImage}
                    alt={activeCall.productName}
                    className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>LIVE PRODUIT ACTIF</span>
                    </span>
                    {activeCall.productPrice > 0 && (
                      <span className="text-xs font-black text-amber-400 shrink-0">
                        {formatCFA(activeCall.productPrice)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-white font-bold truncate mt-0.5">
                    {activeCall.productName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEndCall}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer shrink-0"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Terminer</span>
              </button>
            </div>

            {/* Salle WebRTC Native Nanasore (avec bascule caméra avant/arrière 1 clic) */}
            <div className="flex-1 min-h-0 relative bg-slate-950">
              <NativeCoaching1to1Room
                roomId={activeCall.roomId}
                storeSlug={merchantId || activeCall.sellerId || 'boutique'}
                storeName={storeName || activeCall.storeName}
                isHost={true}
                onCallEnded={handleEndCall}
              />
            </div>

            {/* Footer rassurant vendeur */}
            <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Le bouton « Acheter maintenant » est affiché en direct sur le téléphone du client.</span>
              </span>
              <span className="hidden sm:inline font-mono text-slate-500">Nanasore WebRTC Natif</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveIncomingCallAlert;
