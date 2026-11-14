import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Video, PhoneOff, Loader2, ShieldCheck, AlertCircle, 
  Sparkles, Maximize2, Minimize2, Check, RefreshCw 
} from 'lucide-react';

import { 
  getMonthlyLiveCallsCount, 
  incrementMonthlyLiveCallsCount, 
  isLimitReached, 
  triggerLimitReachedUpsell 
} from '../../../../utils/planFeatures';
import { createLiveProductRoom } from '../../../../services/dailyVideoService';

export interface BuyerLiveCallButtonProps {
  /**
   * Identifiant du produit ou article en vedette (optionnel)
   */
  productId?: string;
  /**
   * Nom du produit affiché (optionnel)
   */
  productName?: string;
  /**
   * Identifiant de l'acheteur (si non fourni, utilise auth.currentUser?.uid ou génère un ID aléatoire)
   */
  buyerId?: string;
  /**
   * Identifiant du vendeur/boutique cible (optionnel)
   */
  sellerId?: string;
  /**
   * Libellé personnalisé du bouton (défaut : "Voir en direct")
   */
  buttonText?: string;
  /**
   * Classes CSS Tailwind additionnelles pour le conteneur du bouton
   */
  className?: string;
  /**
   * Callback déclenché dès que la salle est rejointe
   */
  onCallJoined?: (roomUrl: string, requestId: string) => void;
  /**
   * Callback déclenché lorsque l'appel prend fin
   */
  onCallEnded?: () => void;
  /**
   * Abonnement actuel pour vérification des quotas
   */
  subscription?: any;
}

interface CreateLiveRoomResponse {
  success?: boolean;
  roomUrl: string;
  roomName?: string;
  message?: string;
}

/**
 * Composant Client (Acheteur) : Bouton "Voir en direct" & Lecteur Vidéo Daily.co
 * - Étape 1 : Appel httpsCallable de la fonction createLiveRoom
 * - Étape 2 : Écriture instantanée dans Firestore live_requests (status: 'ringing', dailyRoomUrl)
 * - Étape 3 : Bascule d'interface et chargement du flux vidéo WebRTC Daily.co
 */
export const BuyerLiveCallButton: React.FC<BuyerLiveCallButtonProps> = ({
  productId,
  productName = 'Article sélectionné',
  buyerId: customBuyerId,
  sellerId,
  buttonText = 'Voir en direct',
  className = '',
  onCallJoined,
  onCallEnded,
  subscription
}) => {
  // États de l'interaction
  const [isLoading, setIsLoading] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [dailyRoomUrl, setDailyRoomUrl] = useState<string | null>(null);
  const [meetingToken, setMeetingToken] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Références Daily.co
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const dailyCallFrameRef = useRef<any>(null);

  /**
    * Génère ou récupère l'identifiant de l'acheteur
    */
  const getEffectiveBuyerId = useCallback((): string => {
    if (customBuyerId && customBuyerId.trim()) return customBuyerId.trim();
    // ID anonyme unique persisté en session pour identifier le device acheteur
    const sessionKey = 'nana_buyer_anon_id';
    let storedId = sessionStorage.getItem(sessionKey);
    if (!storedId) {
      storedId = `buyer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem(sessionKey, storedId);
    }
    return storedId;
  }, [customBuyerId]);

  /**
   * Action principale : Clic sur "Voir en direct"
   */
  const handleStartLiveCall = async () => {
    if (isLoading || isInCall) return;

    // Vérification du quota mensuel d'appels en direct (Plan Gratuit : max 3 appels/mois)
    const currentCalls = getMonthlyLiveCallsCount(sellerId);
    if (isLimitReached(subscription, 'LIVE_CALLS', currentCalls)) {
      triggerLimitReachedUpsell(
        'LIVE_CALLS',
        currentCalls,
        3,
        'appels en direct ce mois-ci'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep('Connexion au serveur Daily.co...');

    try {
      const effectiveBuyerId = getEffectiveBuyerId();

      // 1. Création dynamique de la salle Daily.co via Daily API backend
      let roomUrl: string | undefined;
      let roomName: string | undefined;
      let acquiredToken: string | undefined;

      const liveResult = await createLiveProductRoom(
        productId || 'general',
        productName,
        sellerId,
        false // Acheteur = Spectateur (is_owner: false)
      );
      roomUrl = liveResult.url;
      roomName = liveResult.name;
      acquiredToken = liveResult.token;

      if (!roomUrl) {
        throw new Error("L'URL de la salle vidéo n'a pas pu être générée par le serveur.");
      }

      if (acquiredToken) {
        setMeetingToken(acquiredToken);
      }

      setLoadingStep('Envoi du signal de sonnerie au vendeur...');

      // 2. Signalisation Supabase Realtime (La Sonnerie) : Enregistrement dans wameet_messages
      const requestId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      try {
        await supabase.from('wameet_messages').insert({
          id: requestId,
          type: 'call',
          status: 'ringing',
          sender_id: effectiveBuyerId,
          text: productName,
          media_url: roomUrl,
          created_at: new Date().toISOString()
        });
      } catch (signalErr) {
        console.warn('[BUYER LIVE CALL] Repli signalisation Supabase:', signalErr);
      }

      // Incrémentation du compteur d'appels mensuel
      incrementMonthlyLiveCallsCount(sellerId);

      // 3. Bascule locale de l'interface React
      setActiveRequestId(requestId);
      setDailyRoomUrl(roomUrl);
      setCallStatus('ringing');
      setIsInCall(true);
      setIsLoading(false);

      if (onCallJoined) {
        onCallJoined(roomUrl, requestId);
      }
    } catch (err: any) {
      console.error('[BUYER LIVE ERROR]', err);
      setIsLoading(false);
      setErrorMessage(
        err?.message || "Impossible d'initier l'appel en direct. Veuillez réessayer."
      );
    }
  };

  /**
   * Écoute en temps réel de l'état de la demande via Supabase Realtime
   */
  useEffect(() => {
    if (!activeRequestId || !isInCall) return;

    const channelName = `call_req_${activeRequestId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wameet_messages',
          filter: `id=eq.${activeRequestId}`,
        },
        (payload) => {
          if (payload.new) {
            const data = payload.new as any;
            if (data.status === 'connected') {
              setCallStatus('connected');
            } else if (data.status === 'rejected' || data.status === 'completed' || data.status === 'ended') {
              handleHangUp();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRequestId, isInCall]);

  /**
   * Initialisation du lecteur Daily.co via @daily-co/daily-js
   */
  useEffect(() => {
    if (!isInCall || !dailyRoomUrl || !videoContainerRef.current) return;

    let isMounted = true;

    const mountDailyCall = async () => {
      try {
        const DailyIframeModule = await import('@daily-co/daily-js');
        const DailyIframe: any = DailyIframeModule.default || DailyIframeModule;

        if (!isMounted || !videoContainerRef.current) return;

        // Nettoyage préalable d'une éventuelle iframe précédente
        if (dailyCallFrameRef.current) {
          try {
            dailyCallFrameRef.current.destroy();
          } catch (e) {}
          dailyCallFrameRef.current = null;
        }

        // Création de la frame Daily intégrée
        const callFrame = DailyIframe.createFrame(videoContainerRef.current, {
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '1rem',
            backgroundColor: '#020617'
          },
          showLeaveButton: false, // On utilise notre propre bouton de contrôle Tailwind
          showFullscreenButton: false,
          theme: {
            colors: {
              accent: '#10b981', // Émeraude NaNa
              accentText: '#ffffff',
              background: '#020617',
              backgroundAccent: '#0f172a',
              baseText: '#f8fafc',
              border: '#1e293b',
              mainAreaBg: '#020617',
              mainAreaBgAccent: '#090d16'
            }
          }
        });

        dailyCallFrameRef.current = callFrame;

        // Gestionnaires d'événements Daily
        callFrame
          .on('joined-meeting', () => {
            if (isMounted) {
              setCallStatus('connected');
            }
          })
          .on('left-meeting', () => {
            if (isMounted) {
              handleHangUp();
            }
          })
          .on('error', (dailyErr: any) => {
            console.error('[DAILY EMBED ERROR]', dailyErr);
          });

        // Connexion effective à la salle dynamique avec token éphémère si disponible
        const joinOptions: any = {
          url: dailyRoomUrl,
          userName: 'Acheteur'
        };
        if (meetingToken) {
          joinOptions.token = meetingToken;
        }
        await callFrame.join(joinOptions);
      } catch (embedError) {
        console.error('[DAILY MOUNT FAILED]', embedError);
      }
    };

    mountDailyCall();

    return () => {
      isMounted = false;
      if (dailyCallFrameRef.current) {
        try {
          dailyCallFrameRef.current.destroy();
        } catch (e) {}
        dailyCallFrameRef.current = null;
      }
    };
  }, [isInCall, dailyRoomUrl]);

  /**
   * Action de Raccrochage / Fin d'appel
   */
  const handleHangUp = async () => {
    // 1. Quitter la frame Daily
    if (dailyCallFrameRef.current) {
      try {
        await dailyCallFrameRef.current.leave();
        dailyCallFrameRef.current.destroy();
      } catch (e) {}
      dailyCallFrameRef.current = null;
    }

    // 2. Mettre à jour le statut Supabase
    if (activeRequestId) {
      try {
        await supabase
          .from('wameet_messages')
          .update({
            status: 'completed'
          })
          .eq('id', activeRequestId);
      } catch (e) {
        console.warn('[HANGUP SUPABASE ERROR]', e);
      }
    }

    // 3. Réinitialiser les états locaux pour réafficher le bouton d'appel
    setIsInCall(false);
    setDailyRoomUrl(null);
    setActiveRequestId(null);
    setCallStatus('ringing');
    setLoadingStep('');

    if (onCallEnded) {
      onCallEnded();
    }
  };

  /**
   * Bascule Plein Écran
   */
  const toggleFullscreen = () => {
    const el = videoContainerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* =========================================================================
          ÉTAT A : LE BOUTON D'APPEL INITIAL "VOIR EN DIRECT"
         ========================================================================= */}
      {!isInCall ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleStartLiveCall}
            disabled={isLoading}
            className={`
              relative group overflow-hidden py-3.5 px-5 rounded-2xl font-black text-sm
              transition-all duration-300 flex items-center justify-center gap-2.5 shadow-xl select-none cursor-pointer
              ${isLoading 
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700' 
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-emerald-950/40 active:scale-[0.98] border border-emerald-400/40'
              }
            `}
            title="Démarrer un appel vidéo direct avec le vendeur"
          >
            {/* Halo lumineux animé si actif */}
            {!isLoading && (
              <span className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-2xl blur-md opacity-40 group-hover:opacity-80 transition duration-500 animate-pulse pointer-events-none" />
            )}

            <div className="relative flex items-center gap-2.5">
              {isLoading ? (
                <>
                  {/* Spinner Tailwind pendant l'attente */}
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                  <span className="tracking-wide text-xs sm:text-sm font-bold text-slate-200">
                    {loadingStep || 'Connexion au direct en cours...'}
                  </span>
                </>
              ) : (
                <>
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
                  </span>
                  <Video className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform shrink-0" />
                  <span className="tracking-wide uppercase text-xs font-black">
                    {buttonText}
                  </span>
                  <span className="hidden sm:inline-flex text-[11px] font-medium text-emerald-200/90 font-mono bg-black/20 px-2 py-0.5 rounded-full">
                    HD Live
                  </span>
                </>
              )}
            </div>
          </button>

          {/* Affichage d'erreur avec possibilité de réessai */}
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-rose-950/70 border border-rose-500/50 rounded-xl text-rose-200 text-xs animate-in fade-in">
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
      ) : (
        /* =========================================================================
            ÉTAT B : LECTEUR VIDÉO DAILY.CO WEBRTC EMBEDDÉ
           ========================================================================= */
        <div className="w-full bg-[#020617] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100 transition-all duration-300 animate-in fade-in zoom-in-95">
          {/* Barre supérieure d'état */}
          <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {callStatus === 'ringing' ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-extrabold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Sonnerie chez le vendeur...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-extrabold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>EN DIRECT</span>
                </span>
              )}

              <span className="text-xs text-slate-300 font-bold truncate max-w-[180px] sm:max-w-xs">
                {productName}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Plein écran */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
                title="Basculer plein écran"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Bouton Raccrocher */}
              <button
                type="button"
                onClick={handleHangUp}
                className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-950/50 active:scale-95"
                title="Quitter et raccrocher"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Raccrocher</span>
              </button>
            </div>
          </div>

          {/* Conteneur Iframe Daily.co */}
          <div 
            ref={videoContainerRef}
            className="w-full aspect-video sm:min-h-[380px] bg-[#020617] relative flex items-center justify-center overflow-hidden"
          >
            {/* Placeholder / Indicateur de connexion pendant le chargement du flux */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 pointer-events-none">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-pulse">
                <Video className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-400">
                Initialisation du flux vidéo WebRTC sécurisé...
              </p>
            </div>
          </div>

          {/* Barre inférieure de réassurance */}
          <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Communication chiffrée Daily.co</span>
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              ID: {activeRequestId?.slice(-6) || 'LIVE'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerLiveCallButton;
