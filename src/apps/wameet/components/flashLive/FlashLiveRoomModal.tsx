import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhoneOff, Clock, ShoppingBag, Flame, ShieldCheck, Check, 
  Sparkles, ExternalLink, AlertTriangle, PhoneCall, X, ArrowRight
} from 'lucide-react';
import { FlashLiveRequest } from '../../../../types/flashLive';
import { useFlashLiveTimer } from '../../../../hooks/useFlashLiveTimer';
import { completeFlashLiveRequest } from '../../../../services/flashLiveService';
import { VideoPlayerWrapper } from '../live/VideoPlayerWrapper';
import { formatCFA, playTapBeep, playValidationBeep, playCashChime } from '../../../../utils/audio';

export interface FlashLiveRoomModalProps {
  request: FlashLiveRequest;
  isHost?: boolean;
  onClose: () => void;
  onAddToCart?: (quantity: number) => void;
  onDirectCheckout?: (quantity: number) => void;
  storeName?: string;
  whatsappPhone?: string;
}

export const FlashLiveRoomModal: React.FC<FlashLiveRoomModalProps> = ({
  request,
  isHost = false,
  onClose,
  onAddToCart,
  onDirectCheckout,
  storeName = 'ENTREPRISE KONKOBO POUSBILA',
  whatsappPhone = '+22670000000'
}) => {
  const [manualCutoff, setManualCutoff] = useState(false);
  const [addedToCartSuccess, setAddedToCartSuccess] = useState(false);

  // Kill switch strict des 300 secondes (5 minutes)
  const timer = useFlashLiveTimer({
    acceptedAt: request.acceptedAt || Date.now(),
    totalLimitSeconds: 300,
    onCutoff: () => {
      setManualCutoff(true);
      completeFlashLiveRequest(request.id);
    }
  });

  const isCutoff = timer.isCutoff || manualCutoff;

  const handleManualEnd = useCallback(() => {
    playTapBeep();
    setManualCutoff(true);
    completeFlashLiveRequest(request.id);
  }, [request.id]);

  const handleAddToCartClick = () => {
    playCashChime();
    setAddedToCartSuccess(true);
    if (onAddToCart) {
      onAddToCart(1);
    }
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleDirectCheckoutClick = () => {
    playValidationBeep();
    if (onDirectCheckout) {
      onDirectCheckout(1);
    }
    onClose();
  };

  // WhatsApp formaté avec contexte Live Flash
  const cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');
  const whatsappMsg = encodeURIComponent(
    `Bonjour *${storeName}* ! 👁️\n\n` +
    `Je viens de voir l'article *"${request.productName}"* lors du Live Flash de 5 minutes.\n` +
    `Prix : *${formatCFA(request.productPrice)}*\n\n` +
    `Je suis convaincu par la qualité et souhaite valider ma commande immédiatement. Pouvez-vous m'indiquer comment procéder au paiement Mobile Money ? Merci !`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${whatsappMsg}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overscroll-contain">
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.95 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100 relative"
      >
        {/* =========================================================================
            1. EN-TÊTE SUPÉRIEURE DU LIVE FLASH : HORLOGE STRICTE 300s & PRODUIT
           ========================================================================= */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600/90 text-white text-[10px] font-black shadow-md animate-pulse shrink-0">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>LIVE FLASH</span>
            </span>

            {/* Pastille Produit Présenté */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs truncate max-w-[200px] sm:max-w-xs">
              {request.productPhoto ? (
                <img 
                  src={request.productPhoto} 
                  alt={request.productName} 
                  className="w-4 h-4 rounded-md object-cover shrink-0" 
                />
              ) : (
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <span className="font-bold text-slate-200 truncate">{request.productName}</span>
            </div>
          </div>

          {/* Horloge stricte 300s & Bouton Quitter */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`px-2.5 py-1 rounded-xl font-mono text-xs font-black flex items-center gap-1.5 transition-colors shadow-inner ${
              timer.isWarning30s 
                ? 'bg-rose-950 text-rose-300 border border-rose-500/60 animate-bounce' 
                : 'bg-slate-950 text-emerald-400 border border-emerald-500/30'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${timer.isWarning30s ? 'text-rose-400' : 'text-emerald-400'}`} />
              <span>{timer.formattedRemaining}</span>
            </div>

            <button
              type="button"
              onClick={handleManualEnd}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/80 text-slate-300 hover:text-white transition cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center border border-slate-700"
              title="Raccrocher et terminer"
            >
              <PhoneOff className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. BANNIÈRE D'URGENCE TACTIQUE (À 4m30s / 270s)
           ========================================================================= */}
        <AnimatePresence>
          {timer.isWarning30s && !isCutoff && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 px-4 py-2 text-white text-xs font-black flex items-center justify-between shadow-lg overflow-hidden shrink-0 z-20"
            >
              <div className="flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-amber-200" />
                <span>⚠️ Attention : Fin automatique du direct dans {timer.remainingSeconds}s !</span>
              </div>
              <span className="text-[10px] uppercase font-extrabold bg-black/30 px-2 py-0.5 rounded-full">
                Préparez votre commande
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =========================================================================
            3. CORPS CENTRAL : VIDÉO WEBRTC ACTIVE vs ENTONNOIR POST-CALL
           ========================================================================= */}
        <div className="flex-1 overflow-y-auto overscroll-contain relative min-h-[320px] bg-black flex items-center justify-center">
          {!isCutoff ? (
            /* LECTEUR VIDÉO WEBRTC DAILY.CO ENCADRÉ (0 Traceurs avant acceptation) */
            <div className="w-full h-full aspect-video sm:aspect-auto sm:min-h-[420px] relative bg-black">
              <VideoPlayerWrapper
                platform="daily"
                dailyRoomUrl={request.roomUrl}
                isHost={isHost}
                userName={isHost ? 'Boutiquier (Vendeur)' : (request.customerName || 'Client')}
                onLeaveLive={handleManualEnd}
                isCutoff={isCutoff}
                className="w-full h-full border-0 rounded-none"
              />
            </div>
          ) : (
            /* =====================================================================
               4. ENTONNOIR DE CONVERSION POST-CALL (SINGLE-CLICK CTA FUNNEL)
               ===================================================================== */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-5 bg-gradient-to-b from-slate-900 via-slate-950 to-black"
            >
              {/* Badge de réussite */}
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-950/60 flex items-center justify-center">
                <div className="w-full h-full bg-[#070b14] rounded-[22px] flex items-center justify-center text-emerald-400">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
              </div>

              {!isHost ? (
                /* VUE CLIENT : DÉCLENCHEURS D'ACHAT IMMÉDIAT */
                <div className="space-y-2 max-w-md">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Inspection Vidéo Terminée</span>
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    Convaincu par la qualité réelle ?
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Vous avez pu vérifier l'article <strong className="text-white font-bold">{request.productName}</strong> avec le boutiquier. Validez votre achat en 1 clic avant épuisement du stock !
                  </p>

                  {/* Prix en grand */}
                  <div className="py-2">
                    <span className="text-3xl font-black text-emerald-400 tracking-tight">
                      {formatCFA(request.productPrice)}
                    </span>
                  </div>

                  {/* Actions de conversion à très haute performance */}
                  <div className="pt-3 space-y-2.5 w-full">
                    <button
                      type="button"
                      onClick={handleAddToCartClick}
                      disabled={addedToCartSuccess}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-sm shadow-xl shadow-emerald-950/60 transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
                    >
                      {addedToCartSuccess ? (
                        <>
                          <Check className="w-5 h-5 stroke-[3]" />
                          <span>Produit Ajouté au Panier !</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-5 h-5" />
                          <span>🛒 Ajouter au Panier Maintenant</span>
                        </>
                      )}
                    </button>

                    {onDirectCheckout && (
                      <button
                        type="button"
                        onClick={handleDirectCheckoutClick}
                        className="w-full py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-2 border border-slate-700 min-h-[44px]"
                      >
                        <Flame className="w-4 h-4 text-amber-400" />
                        <span>Commander Directement (Mobile Money)</span>
                      </button>
                    )}

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => playTapBeep()}
                      className="w-full py-3 px-5 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      <PhoneCall className="w-4 h-4 text-emerald-400" />
                      <span>Finaliser la commande sur WhatsApp</span>
                    </a>
                  </div>
                </div>
              ) : (
                /* VUE MARCHAND : RÉCAPITULATIF & CLÔTURE */
                <div className="space-y-3 max-w-sm">
                  <h3 className="text-lg font-black text-white">Session Live Flash Terminée</h3>
                  <p className="text-xs text-slate-400">
                    La session de 5 minutes est écoulée. Le client a été automatiquement redirigé vers le bouton d'achat direct et le panier virtuel pour ce produit.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Retourner au Tableau de Bord
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Pied de page informatif discret pendant le live */}
        {!isCutoff && (
          <div className="px-4 py-2 bg-slate-950/95 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chiffrement WebRTC de bout en bout • Limite stricte 5 min</span>
            </span>
            <span className="font-mono text-slate-400">ID: {request.id.slice(-6)}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default FlashLiveRoomModal;
