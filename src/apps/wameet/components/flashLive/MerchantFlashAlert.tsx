import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhoneCall, PhoneOff, ShoppingBag, Clock, Sparkles, 
  Eye, Check, X, Video, ShieldAlert, Loader2
} from 'lucide-react';
import { FlashLiveRequest } from '../../../../types/flashLive';
import { 
  subscribeToMerchantFlashRequests, 
  acceptFlashLiveRequest, 
  rejectFlashLiveRequest,
  playIncomingCallRingtone 
} from '../../../../services/flashLiveService';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';

// Dynamic lazy load of WebRTC room on merchant side
const FlashLiveRoomModal = React.lazy(() => 
  import('./FlashLiveRoomModal').then(m => ({ default: m.FlashLiveRoomModal }))
);

export interface MerchantFlashAlertProps {
  merchantId?: string;
  storeName?: string;
}

export const MerchantFlashAlert: React.FC<MerchantFlashAlertProps> = ({
  merchantId = 'store-konkobo-telecom',
  storeName = 'ENTREPRISE KONKOBO POUSBILA'
}) => {
  const [pendingRequests, setPendingRequests] = useState<FlashLiveRequest[]>([]);
  const [activeHostRequest, setActiveHostRequest] = useState<FlashLiveRequest | null>(null);
  const ringtoneIntervalRef = useRef<any>(null);

  // 1. Écoute temps réel des demandes entrantes
  useEffect(() => {
    const unsubscribe = subscribeToMerchantFlashRequests(merchantId, (requests) => {
      setPendingRequests(requests);

      // Si de nouvelles demandes arrivent et qu'on n'est pas déjà en salle, jouer la sonnerie
      if (requests.length > 0 && !activeHostRequest) {
        if (!ringtoneIntervalRef.current) {
          playIncomingCallRingtone();
          ringtoneIntervalRef.current = setInterval(() => {
            playIncomingCallRingtone();
          }, 3500);
        }
      } else {
        if (ringtoneIntervalRef.current) {
          clearInterval(ringtoneIntervalRef.current);
          ringtoneIntervalRef.current = null;
        }
      }
    });

    return () => {
      unsubscribe();
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
        ringtoneIntervalRef.current = null;
      }
    };
  }, [merchantId, activeHostRequest]);

  // Arrêt de la sonnerie lors de la sélection ou du refus
  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  };

  // 2. Accepter la demande de Live Flash
  const handleAccept = async (req: FlashLiveRequest) => {
    stopRingtone();
    playValidationBeep();
    try {
      const updated = await acceptFlashLiveRequest(req.id);
      setActiveHostRequest(updated);
      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (err) {
      console.warn('Error accepting flash request:', err);
    }
  };

  // 3. Refuser la demande
  const handleReject = async (req: FlashLiveRequest) => {
    stopRingtone();
    playTapBeep();
    try {
      await rejectFlashLiveRequest(req.id);
      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (err) {
      console.warn('Error rejecting flash request:', err);
    }
  };

  // Fermeture de la salle côté marchand
  const handleCloseRoom = () => {
    setActiveHostRequest(null);
  };

  const topRequest = pendingRequests[0];

  return (
    <>
      {/* ALERTE ENTRANTE FLOTTANTE NON-INTRUSIVE (HIGH PRIORITY TOAST) */}
      <AnimatePresence>
        {topRequest && !activeHostRequest && (
          <div className="fixed top-4 right-4 z-[90] max-w-md w-[calc(100vw-2rem)] sm:w-96 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl border-2 border-emerald-500/70 rounded-3xl p-4 shadow-2xl shadow-emerald-950/60 text-slate-100 flex flex-col gap-3 relative overflow-hidden"
            >
              {/* Halo d'ambiance pulsant */}
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-emerald-500/15 rounded-full blur-xl animate-pulse pointer-events-none" />

              {/* En-tête de l'alerte */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                    <span>Demande de Live Flash (5 min)</span>
                  </span>
                </div>

                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                  Direct Boutique
                </span>
              </div>

              {/* Contenu Produit & Client */}
              <div className="flex items-center gap-3 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800/80">
                <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-800 flex items-center justify-center">
                  {topRequest.productPhoto ? (
                    <img 
                      src={topRequest.productPhoto} 
                      alt={topRequest.productName} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <ShoppingBag className="w-6 h-6 text-emerald-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-white truncate">
                    {topRequest.productName}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-black text-emerald-400">
                      {formatCFA(topRequest.productPrice)}
                    </span>
                    <span className="text-[10.5px] text-slate-400 truncate">
                      • {topRequest.customerName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Boutons d'action Commerçant */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleReject(topRequest)}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Refuser</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAccept(topRequest)}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40"
                >
                  <Video className="w-4 h-4" />
                  <span>Accepter (5 min)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SALLE WEBRTC COMMERÇANT LORSQUE LE LIVE EST ACCEPTÉ */}
      {activeHostRequest && (
        <React.Suspense fallback={
          <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center text-slate-100 p-4">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
            <span className="text-xs font-bold">Démarrage du Live Flash Commerçant...</span>
          </div>
        }>
          <FlashLiveRoomModal
            request={activeHostRequest}
            isHost={true}
            onClose={handleCloseRoom}
            storeName={storeName}
          />
        </React.Suspense>
      )}
    </>
  );
};

export default MerchantFlashAlert;
