import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, Video, PhoneCall, X, AlertCircle, Sparkles, 
  ShieldCheck, Loader2, MessageSquare, ArrowRight, Check
} from 'lucide-react';
import { FlashLiveRequest } from '../../../../types/flashLive';
import { 
  createFlashLiveRequest, 
  subscribeToFlashLiveRequest, 
  cancelFlashLiveRequest 
} from '../../../../services/flashLiveService';
import { playTapBeep, playValidationBeep, formatCFA } from '../../../../utils/audio';

// Dynamic lazy load of the WebRTC Room to guarantee ZERO byte overhead on product page load
const FlashLiveRoomModal = React.lazy(() => 
  import('./FlashLiveRoomModal').then(m => ({ default: m.FlashLiveRoomModal }))
);

export interface FlashLiveButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
  merchantId?: string;
  storeName?: string;
  whatsappPhone?: string;
  onAddToCart?: (quantity: number) => void;
  onDirectCheckout?: (quantity: number) => void;
  className?: string;
}

export const FlashLiveButton: React.FC<FlashLiveButtonProps> = ({
  product,
  merchantId = 'store-konkobo-telecom',
  storeName = 'ENTREPRISE KONKOBO POUSBILA',
  whatsappPhone = '+22670000000',
  onAddToCart,
  onDirectCheckout,
  className = ''
}) => {
  const [activeRequest, setActiveRequest] = useState<FlashLiveRequest | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [rejectedNotice, setRejectedNotice] = useState(false);

  // Écoute en temps réel de la demande créée
  useEffect(() => {
    if (!activeRequest) return;

    const unsubscribe = subscribeToFlashLiveRequest(activeRequest.id, (updated) => {
      if (!updated) return;
      setActiveRequest(updated);

      if (updated.status === 'accepted') {
        setIsCalling(false);
        setIsInRoom(true);
        setRejectedNotice(false);
        playValidationBeep();
      } else if (updated.status === 'rejected') {
        setIsCalling(false);
        setIsInRoom(false);
        setRejectedNotice(true);
      }
    });

    return () => unsubscribe();
  }, [activeRequest?.id]);

  // Déclenchement de l'appel Live Flash 5 min
  const handleStartCall = async () => {
    playTapBeep();
    setRejectedNotice(false);
    setIsCalling(true);

    try {
      const req = await createFlashLiveRequest({
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        productPhoto: product.image,
        merchantId,
        storeName,
        customerName: 'Client Boutique (Live Flash)'
      });
      setActiveRequest(req);
    } catch (err) {
      console.warn('Error starting flash call:', err);
      setIsCalling(false);
    }
  };

  // Annulation de l'appel par le client
  const handleCancelCall = () => {
    playTapBeep();
    if (activeRequest) {
      cancelFlashLiveRequest(activeRequest.id);
    }
    setIsCalling(false);
    setActiveRequest(null);
  };

  // Fermeture de la salle ou notification rejetée
  const handleCloseRoom = () => {
    setIsInRoom(false);
    setActiveRequest(null);
  };

  return (
    <>
      {/* 1. BOUTON PULSANT "VOIR EN DIRECT (5 MIN)" HAUTE CONVERSION */}
      <button
        type="button"
        onClick={handleStartCall}
        className={`relative group overflow-hidden py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 active:scale-[0.98] text-white font-extrabold text-xs shadow-lg shadow-teal-950/40 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40 select-none ${className}`}
        title="Voir l'article réel en vidéo en direct avec le commerçant (durée max: 5 min)"
      >
        {/* Halo lumineux d'arrière-plan */}
        <span className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-xl blur-sm opacity-40 group-hover:opacity-80 transition duration-500 animate-pulse pointer-events-none" />

        <div className="relative flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <Eye className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
          <span className="tracking-wide font-black">
            👁️ Voir en Direct <span className="text-emerald-200 text-[11px] font-bold font-mono">(5 min)</span>
          </span>
        </div>
      </button>

      {/* 2. MODALE D'ATTENTE LÉGÈRE : APPEL DU BOUTIQUIER EN COURS */}
      <AnimatePresence>
        {isCalling && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overscroll-contain">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-100 shadow-2xl flex flex-col items-center space-y-4 relative"
            >
              {/* Vagues de radar concentriques animées */}
              <div className="relative flex items-center justify-center w-24 h-24 my-2">
                <span className="absolute w-24 h-24 rounded-full bg-emerald-500/15 animate-ping duration-1000" />
                <span className="absolute w-18 h-18 rounded-full bg-teal-500/20 animate-pulse" />
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-950/60 z-10">
                  <Video className="w-7 h-7 stroke-[2.5]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-black text-white">
                  Appel du boutiquier en cours...
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                  Le commerçant reçoit votre notification pour vous montrer <strong className="text-white font-bold">"{product.name}"</strong> en direct vidéo.
                </p>
              </div>

              {/* Rappels de réassurance */}
              <div className="w-full bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 text-[11px] text-slate-400 space-y-1.5 text-left">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Vidéo HD sécurisée sans engagement</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>Durée limitée à 5 minutes chrono</span>
                </div>
              </div>

              {/* Bouton d'annulation */}
              <button
                type="button"
                onClick={handleCancelCall}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
              >
                Annuler l'appel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. MODALE EN CAS D'INDISPONIBILITÉ DU MARCHAND */}
      <AnimatePresence>
        {rejectedNotice && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overscroll-contain">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-100 shadow-2xl flex flex-col items-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-black text-white">Commerçant momentanément indisponible</h4>
                <p className="text-xs text-slate-400">
                  Le boutiquier est actuellement occupé en caisse. Vous pouvez lui poser une question sur WhatsApp ou ajouter l'article au panier.
                </p>
              </div>

              <div className="w-full space-y-2 pt-2">
                <a
                  href={`https://api.whatsapp.com/send?phone=${whatsappPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(`Bonjour ! J'étais intéressé par ${product.name} (${formatCFA(product.price)}). Est-il disponible ?`)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => playTapBeep()}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 transition"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Contacter sur WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => setRejectedNotice(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. SALLE FLASH LIVE 5 MINUTES (CODE-SPLIT DYNAMIQUE AVEC SUSPENSE) */}
      {isInRoom && activeRequest && (
        <React.Suspense fallback={
          <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center text-slate-100 p-4">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
            <span className="text-xs font-bold">Connexion à la salle Live Flash...</span>
          </div>
        }>
          <FlashLiveRoomModal
            request={activeRequest}
            isHost={false}
            onClose={handleCloseRoom}
            onAddToCart={onAddToCart}
            onDirectCheckout={onDirectCheckout}
            storeName={storeName}
            whatsappPhone={whatsappPhone}
          />
        </React.Suspense>
      )}
    </>
  );
};

export default FlashLiveButton;
