import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  PhoneCall, PhoneOff, Video, ShoppingBag, ShieldCheck, 
  Maximize2, Minimize2, Loader2, Sparkles, X, AlertCircle 
} from 'lucide-react';
import { playIncomingCallRingtone } from '../../../../services/flashLiveService';

export interface LiveIncomingCallAlertProps {
  /**
   * Filtrer par identifiant de commerçant (optionnel)
   */
  merchantId?: string;
  /**
   * Nom de la boutique (optionnel)
   */
  storeName?: string;
}

interface IncomingLiveRequest {
  id: string;
  buyerId?: string;
  dailyRoomUrl: string;
  roomName?: string;
  status: 'ringing' | 'connected' | 'rejected' | 'completed';
  productName?: string;
  productId?: string;
  createdAt?: any;
}

/**
 * Composant Récepteur Vendeur (Ordinateur / Dashboard POS)
 * - Écoute en temps réel la collection Firestore `live_requests` (status: 'ringing')
 * - Déclenche la sonnerie audio et l'alerte visuelle sur l'ordinateur
 * - Permet au commerçant de "Décrocher" pour ouvrir la même salle Daily.co
 */
export const LiveIncomingCallAlert: React.FC<LiveIncomingCallAlertProps> = ({
  merchantId,
  storeName = 'Boutique NaNa'
}) => {
  const [incomingCall, setIncomingCall] = useState<IncomingLiveRequest | null>(null);
  const [activeCallRoomUrl, setActiveCallRoomUrl] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [activeProductName, setActiveProductName] = useState<string>('Direct Boutique');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const ringtoneTimerRef = useRef<any>(null);
  const hostVideoContainerRef = useRef<HTMLDivElement>(null);
  const hostDailyFrameRef = useRef<any>(null);

  /**
   * 1. Écoute Supabase Realtime des appels entrants
   */
  useEffect(() => {
    const channelName = `incoming_calls_${merchantId || 'all'}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wameet_messages',
        },
        (payload) => {
          if (payload.new) {
            const row = payload.new as any;
            if (row.type === 'call' && row.status === 'ringing') {
              setIncomingCall({
                id: row.id,
                buyerId: row.sender_id,
                dailyRoomUrl: row.media_url || '',
                roomName: row.text || 'Appel Live',
              });
              startRingtone();
            } else if (row.status !== 'ringing') {
              setIncomingCall(null);
              stopRingtone();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopRingtone();
    };
  }, [merchantId, activeCallRoomUrl]);

  /**
   * Gestion de la sonnerie
   */
  const startRingtone = () => {
    if (!ringtoneTimerRef.current) {
      try {
        playIncomingCallRingtone();
      } catch (e) {}
      ringtoneTimerRef.current = setInterval(() => {
        try {
          playIncomingCallRingtone();
        } catch (e) {}
      }, 3500);
    }
  };

  const stopRingtone = () => {
    if (ringtoneTimerRef.current) {
      clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
  };

  /**
   * 2. Le vendeur décroche l'appel
   */
  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    stopRingtone();
    const roomUrl = incomingCall.dailyRoomUrl;
    const reqId = incomingCall.id;
    const prodName = incomingCall.productName || 'Article Boutique';

    setActiveCallRoomUrl(roomUrl);
    setActiveRequestId(reqId);
    setActiveProductName(prodName);
    setIncomingCall(null);

    // Mettre à jour le message Supabase -> 'connected'
    try {
      await supabase
        .from('wameet_messages')
        .update({
          status: 'connected'
        })
        .eq('id', reqId);
    } catch (e) {
      console.warn('[ACCEPT SUPABASE UPDATE ERROR]', e);
    }
  };

  /**
   * 3. Le vendeur refuse l'appel
   */
  const handleRejectCall = async () => {
    if (!incomingCall) return;

    stopRingtone();
    const reqId = incomingCall.id;
    setIncomingCall(null);

    try {
      await supabase
        .from('wameet_messages')
        .update({
          status: 'rejected'
        })
        .eq('id', reqId);
    } catch (e) {
      console.warn('[REJECT SUPABASE UPDATE ERROR]', e);
    }
  };

  /**
   * 4. Initialisation du lecteur vidéo Daily.co côté vendeur une fois l'appel décroché
   */
  useEffect(() => {
    if (!activeCallRoomUrl || !hostVideoContainerRef.current) return;

    let isMounted = true;

    const mountHostDaily = async () => {
      try {
        const DailyIframeModule = await import('@daily-co/daily-js');
        const DailyIframe: any = DailyIframeModule.default || DailyIframeModule;

        if (!isMounted || !hostVideoContainerRef.current) return;

        if (hostDailyFrameRef.current) {
          try {
            hostDailyFrameRef.current.destroy();
          } catch (e) {}
          hostDailyFrameRef.current = null;
        }

        const callFrame = DailyIframe.createFrame(hostVideoContainerRef.current, {
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '1.25rem',
            backgroundColor: '#020617'
          },
          showLeaveButton: false,
          showFullscreenButton: false,
          theme: {
            colors: {
              accent: '#10b981',
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

        hostDailyFrameRef.current = callFrame;

        callFrame.on('left-meeting', () => {
          if (isMounted) handleEndCall();
        });

        await callFrame.join({
          url: activeCallRoomUrl,
          userName: 'Vendeur (Ordinateur)'
        });
      } catch (err) {
        console.error('[HOST DAILY MOUNT ERROR]', err);
      }
    };

    mountHostDaily();

    return () => {
      isMounted = false;
      if (hostDailyFrameRef.current) {
        try {
          hostDailyFrameRef.current.destroy();
        } catch (e) {}
        hostDailyFrameRef.current = null;
      }
    };
  }, [activeCallRoomUrl]);

  /**
   * 5. Fin d'appel côté vendeur
   */
  const handleEndCall = async () => {
    if (hostDailyFrameRef.current) {
      try {
        await hostDailyFrameRef.current.leave();
        hostDailyFrameRef.current.destroy();
      } catch (e) {}
      hostDailyFrameRef.current = null;
    }

    if (activeRequestId) {
      try {
        await supabase
          .from('wameet_messages')
          .update({
            status: 'completed'
          })
          .eq('id', activeRequestId);
      } catch (e) {}
    }

    setActiveCallRoomUrl(null);
    setActiveRequestId(null);
  };

  const toggleFullscreen = () => {
    const el = hostVideoContainerRef.current;
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
    <>
      {/* =========================================================================
          1. TOAST / MODALE D'APPEL ENTRANT (SONNERIE SUR L'ORDINATEUR)
         ========================================================================= */}
      {incomingCall && !activeCallRoomUrl && (
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
                  <span>Appel Vidéo Client Entrant !</span>
                </span>
              </div>

              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                Live NaNa
              </span>
            </div>

            {/* Détails du produit et de l'acheteur */}
            <div className="flex items-center gap-3 bg-slate-950/90 p-3 rounded-2xl border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-white truncate">
                  {incomingCall.productName || 'Article en boutique'}
                </h4>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  Un client sur téléphone souhaite voir l'article en direct !
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
          2. SALLE VIDÉO ACTIVE SUR L'ORDINATEUR DU VENDEUR
         ========================================================================= */}
      {activeCallRoomUrl && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] text-slate-100">
            {/* Header Vendeur */}
            <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>COMMUNICATION LIVE ACTIVE</span>
                </span>
                <span className="text-xs text-slate-300 font-bold truncate">
                  {activeProductName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
                  title="Plein écran"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleEndCall}
                  className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-950/50 active:scale-95"
                  title="Mettre fin à l'appel"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Raccrocher</span>
                </button>
              </div>
            </div>

            {/* Zone Vidéo Daily.co */}
            <div 
              ref={hostVideoContainerRef}
              className="w-full aspect-video sm:min-h-[480px] bg-[#020617] relative flex items-center justify-center overflow-hidden"
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 pointer-events-none">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-xs text-slate-400">
                  Connexion au flux vidéo de l'acheteur...
                </p>
              </div>
            </div>

            {/* Pied de page Vendeur */}
            <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Flux Direct Haute Définition WebRTC Daily.co</span>
              </span>
              <span className="font-mono text-slate-400 text-[11px]">
                ID: {activeRequestId?.slice(-6) || 'ROOM'}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveIncomingCallAlert;
