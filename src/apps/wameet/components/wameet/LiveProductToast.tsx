import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap,
  X,
  ShoppingBag,
  Flame,
  Sparkles,
  Handshake,
  Clock,
  Check,
  CheckCircle2,
  AlertCircle,
  Bot,
  Lock,
  ArrowLeft,
  RotateCcw,
  Percent
} from 'lucide-react';
import {
  playValidationBeep,
  playTapBeep,
  playCashChime,
  playCancelSound
} from '../../../../utils/audio';

export type NegotiationState = 'idle' | 'offering' | 'counter_offer' | 'accepted' | 'expired';

export interface LiveProductToastItem {
  id: string;
  name: string;
  price?: number;
  promoPrice?: number;
  originalPrice?: number;
  compareAtPrice?: number;
  imageUrl?: string;
  stock?: number;
  discountPercentage?: number;
  negotiatedPrice?: number;
  [key: string]: any;
}

export interface LiveProductToastProps {
  product: LiveProductToastItem | null;
  isOpen?: boolean;
  onBuyClick?: (product: LiveProductToastItem) => void;
  onClose?: () => void;
  currency?: string;
  className?: string;

  // Directives Smart Haggle
  initialNegotiationState?: NegotiationState;
  onNegotiationStateChange?: (state: NegotiationState) => void;
  onMakeOffer?: (
    offeredPrice: number,
    product: LiveProductToastItem
  ) => Promise<{ counterPrice: number; message: string } | null> | void;
  onAcceptOffer?: (acceptedPrice: number, product: LiveProductToastItem) => void;
  countdownDurationSeconds?: number; // Par défaut 120 (2 minutes)
}

/**
 * Formate un montant en devise avec séparateur de milliers
 */
export function formatToastPrice(amount?: number, currency = 'FCFA'): string {
  if (amount == null) return `0 ${currency}`;
  return `${Math.round(amount).toLocaleString('fr-FR')} ${currency}`;
}

/**
 * Déclenchement sécurisé du confetti sans bloquer en cas d'absence
 */
function triggerCelebrationConfetti(): void {
  try {
    if (typeof window !== 'undefined') {
      import('canvas-confetti')
        .then((module) => {
          const confettiFn = module.default || module;
          confettiFn({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.8 },
            colors: ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6']
          });
        })
        .catch(() => {});
    }
  } catch {}
}

/**
 * COMPOSANT LiveProductToast (Mode Négociation "Smart Haggle" Wameet)
 * 
 * Intègre le cycle complet de marchandage automatisé IA en direct :
 * 1. 'idle' : Vue standard avec 2 boutons (Acheter à X FCFA [noir] & Faire une offre 🤝 [doré pulsant]).
 * 2. 'offering' : Bottom-sheet / modal d'offre rapide avec mini-clavier tactile et raccourcis.
 * 3. 'counter_offer' : Bulle de chat privée de l'IA ("À 15 000F c'est compliqué...") avec barre FOMO rouge 2min.
 * 4. 'expired' : Expiration du compte à rebours, bouton désactivé et grisé.
 * 5. 'accepted' : Validation festive de l'offre conclue et redirection d'achat sécurisé.
 */
export const LiveProductToast: React.FC<LiveProductToastProps> = ({
  product,
  isOpen = true,
  onBuyClick,
  onClose,
  currency = 'FCFA',
  className = '',
  initialNegotiationState = 'idle',
  onNegotiationStateChange,
  onMakeOffer,
  onAcceptOffer,
  countdownDurationSeconds = 120
}) => {
  // État local de la négociation
  const [negotiationState, setNegotiationState] = useState<NegotiationState>(initialNegotiationState);

  // Prix et données de négociation
  const [offeredPrice, setOfferedPrice] = useState<number | null>(null);
  const [counterPrice, setCounterPrice] = useState<number | null>(null);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [keypadInput, setKeypadInput] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  // Compte à rebours FOMO (défaut 120 secondes = 2 minutes)
  const [timeRemaining, setTimeRemaining] = useState<number>(countdownDurationSeconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const numericInputRef = useRef<HTMLInputElement>(null);

  // Calcul du prix promo et de l'ancien prix
  const promoPrice = product?.promoPrice ?? product?.price ?? 0;
  const originalPrice = product?.originalPrice ?? product?.compareAtPrice;
  const hasDiscount = originalPrice && originalPrice > promoPrice;
  const discountPercent =
    product?.discountPercentage ||
    (hasDiscount ? Math.round(((originalPrice - promoPrice) / originalPrice) * 100) : null);

  // Synchronisation des états externes
  const updateState = useCallback(
    (newState: NegotiationState) => {
      setNegotiationState(newState);
      if (onNegotiationStateChange) {
        onNegotiationStateChange(newState);
      }
    },
    [onNegotiationStateChange]
  );

  // Nettoyage du timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Gestion du compte à rebours lors de la contre-offre IA
  useEffect(() => {
    if (negotiationState === 'counter_offer') {
      setTimeRemaining(countdownDurationSeconds);
      clearTimer();

      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearTimer();
            try {
              playCancelSound();
            } catch {}
            updateState('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearTimer();
    }

    return () => clearTimer();
  }, [negotiationState, countdownDurationSeconds, clearTimer, updateState]);

  if (!isOpen || !product) return null;

  // Calcul du pourcentage restant pour la barre de progression rouge agressive
  const progressPercent = Math.max(0, Math.min(100, (timeRemaining / countdownDurationSeconds) * 100));

  // Formatage mm:ss pour l'affichage de l'urgence
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedCountdown = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // 1. ACHAT CLASSIQUE DIRECT (Bouton fond noir)
  const handleClassicBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      playValidationBeep();
    } catch {}
    if (onBuyClick) {
      onBuyClick(product);
    }
  };

  // 2. OUVERTURE DE LA MODALE D'OFFRE (Bouton fond doré)
  const handleStartOffer = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      playTapBeep();
    } catch {}
    setOfferError(null);
    setKeypadInput('');
    updateState('offering');
    setTimeout(() => {
      numericInputRef.current?.focus();
    }, 150);
  };

  // 3. GESTION DU CLAVIER TACTILE / SAISIE RAPIDE
  const handleKeypadPress = (val: string) => {
    try {
      playTapBeep();
    } catch {}
    setOfferError(null);

    if (val === 'BACK') {
      setKeypadInput((prev) => prev.slice(0, -1));
      return;
    }

    if (val === '00' && (keypadInput === '' || keypadInput === '0')) {
      return;
    }

    if (keypadInput.length >= 9) return; // Limite raisonnable
    setKeypadInput((prev) => (prev === '0' ? val : prev + val));
  };

  // 4. RACCOURCIS DE POURCENTAGE (-10%, -15%, -20%, -30%)
  const handleQuickPercentDiscount = (percent: number) => {
    try {
      playTapBeep();
    } catch {}
    setOfferError(null);
    const calculated = Math.round((promoPrice * (100 - percent)) / 100 / 100) * 100;
    setKeypadInput(calculated.toString());
  };

  // 5. VALIDATION DE L'OFFRE UTILISATEUR & APPEL IA
  const handleSubmitOffer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const enteredAmount = parseInt(keypadInput.replace(/\D/g, ''), 10);

    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      setOfferError('Veuillez entrer un montant valide');
      return;
    }

    if (enteredAmount >= promoPrice) {
      setOfferError(`Proposez un prix inférieur au prix du direct (${formatToastPrice(promoPrice, currency)})`);
      return;
    }

    if (enteredAmount < promoPrice * 0.3) {
      setOfferError('Offre trop basse pour le vendeur. Proposez au moins 30% du prix.');
      return;
    }

    try {
      playTapBeep();
    } catch {}

    setOfferedPrice(enteredAmount);
    setIsAiThinking(true);
    setOfferError(null);

    // Déclenche callback externe ou simulation IA intelligente
    try {
      let resolvedCounterPrice: number;
      let resolvedMessage: string;

      if (onMakeOffer) {
        const result = await onMakeOffer(enteredAmount, product);
        if (result) {
          resolvedCounterPrice = result.counterPrice;
          resolvedMessage = result.message;
        } else {
          // Fallback calcul IA standard : compromis intelligent au demi-millier
          resolvedCounterPrice = Math.round(((enteredAmount + promoPrice) / 2) / 500) * 500;
          resolvedMessage = `À ${enteredAmount.toLocaleString('fr-FR')}F c'est compliqué, mais je te le laisse à ${resolvedCounterPrice.toLocaleString('fr-FR')}F !`;
        }
      } else {
        // Pause réaliste de 700ms pour l'IA Wameet
        await new Promise((resolve) => setTimeout(resolve, 700));
        resolvedCounterPrice = Math.round(((enteredAmount + promoPrice) / 2) / 500) * 500;
        resolvedMessage = `À ${enteredAmount.toLocaleString('fr-FR')}F c'est compliqué, mais je te le laisse à ${resolvedCounterPrice.toLocaleString('fr-FR')}F !`;
      }

      setCounterPrice(resolvedCounterPrice);
      setAiMessage(resolvedMessage);
      setIsAiThinking(false);
      updateState('counter_offer');
      try {
        playValidationBeep();
      } catch {}
    } catch (err) {
      setIsAiThinking(false);
      setOfferError('Erreur de connexion avec l’IA de négociation. Réessayez.');
    }
  };

  // 6. ACCEPTATION DE LA CONTRE-OFFRE PAR L'UTILISATEUR
  const handleAcceptCounterOffer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (negotiationState === 'expired' || !counterPrice) return;

    clearTimer();
    try {
      playCashChime();
    } catch {}
    triggerCelebrationConfetti();
    updateState('accepted');

    const negotiatedItem: LiveProductToastItem = {
      ...product,
      price: counterPrice,
      negotiatedPrice: counterPrice
    };

    if (onAcceptOffer) {
      onAcceptOffer(counterPrice, negotiatedItem);
    }
  };

  // 7. FINALISATION DU PAIEMENT APRÈS ACCEPTATION
  const handleFinalizeNegotiatedPurchase = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      playValidationBeep();
    } catch {}

    const negotiatedItem: LiveProductToastItem = {
      ...product,
      price: counterPrice || promoPrice,
      negotiatedPrice: counterPrice || promoPrice
    };

    if (onBuyClick) {
      onBuyClick(negotiatedItem);
    }
  };

  // 8. FERMETURE DU TOAST
  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearTimer();
    try {
      playTapBeep();
    } catch {}
    if (onClose) {
      onClose();
    }
  };

  // 9. ANNULATION DU MARCHANDAGE / RETOUR À L'ÉTAT IDLE
  const handleResetToIdle = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearTimer();
    try {
      playTapBeep();
    } catch {}
    updateState('idle');
  };

  return (
    <div
      role="region"
      aria-label="Marchandage produit en direct"
      className={`w-full max-w-md mx-auto bg-white/95 backdrop-blur-xl border border-white/80 shadow-[0_16px_40px_rgba(0,0,0,0.3)] rounded-2xl p-3 sm:p-3.5 transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in overflow-hidden ${className}`}
    >
      {/* =====================================================================
          ÉTAT 1 : 'idle' — VUE STANDARD AVEC 2 BOUTONS CÔTE À CÔTE
          - Bouton classique "Acheter à X FCFA" (fond noir)
          - Bouton "Faire une offre 🤝" (fond doré/jaune avec animate-pulse)
         ===================================================================== */}
      {negotiationState === 'idle' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {/* Miniature du produit à gauche */}
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80 shadow-xs">
              <img
                src={
                  product.imageUrl ||
                  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80'
                }
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {discountPercent && (
                <span className="absolute top-1 left-1 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md shadow-xs">
                  -{discountPercent}%
                </span>
              )}
            </div>

            {/* Détails du produit : Nom + Prix barré et Prix Promo */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md border border-rose-200/60">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Offre Live Flash</span>
                </span>

                {/* Bouton pour fermer temporairement le toast */}
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-slate-400 hover:text-slate-600 p-1 -mr-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Fermer la fiche produit"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate mt-0.5">
                {product.name}
              </h4>

              {/* Tarification */}
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-base sm:text-lg font-black text-rose-600 tracking-tight">
                  {formatToastPrice(promoPrice, currency)}
                </span>

                {hasDiscount && (
                  <span className="text-xs font-semibold text-slate-400 line-through">
                    {formatToastPrice(originalPrice, currency)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* =================================================================
              LES DEUX BOUTONS CÔTE À CÔTE AU MILLIMÈTRE :
              1. Bouton Classique "Acheter à X FCFA" (fond noir)
              2. Bouton "Faire une offre 🤝" (fond doré/jaune avec animate-pulse)
             ================================================================= */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            {/* Bouton 1 : Classique Noir */}
            <button
              type="button"
              onClick={handleClassicBuy}
              className="py-2.5 px-2 rounded-xl bg-slate-950 hover:bg-black active:scale-95 text-white text-xs sm:text-sm font-black shadow-md border border-slate-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer truncate"
              title={`Acheter à ${formatToastPrice(promoPrice, currency)}`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="truncate">Acheter à {formatToastPrice(promoPrice, currency)}</span>
            </button>

            {/* Bouton 2 : Faire une offre (Doré / Jaune avec pulsation subtile) */}
            <button
              type="button"
              onClick={handleStartOffer}
              className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-500 active:scale-95 text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-amber-400/25 animate-pulse hover:animate-none flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-amber-300 truncate"
              title="Faire une offre 🤝"
            >
              <Handshake className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span className="truncate">Faire une offre 🤝</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          ÉTAT 2 : 'offering' — MODAL D'OFFRE RAPIDE (BOTTOM-SHEET)
          - Glisse depuis le bas (bottom-sheet)
          - Mini-clavier tactile + input stylisé
          - Validation du prix proposé
         ===================================================================== */}
      {negotiationState === 'offering' && (
        <div className="animate-in slide-in-from-bottom-6 duration-300 space-y-3">
          {/* Poignée supérieure de la bottom-sheet */}
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />

          {/* En-tête de négociation */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToIdle}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                aria-label="Retour"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Handshake className="w-3 h-3 text-amber-600" />
                  <span>Smart Haggle Wameet</span>
                </span>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                  Proposez votre prix en direct
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetToIdle}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Rappel du produit et du prix du Live */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl p-2 px-2.5 text-xs">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
              />
              <span className="font-bold text-slate-800 truncate">{product.name}</span>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] font-semibold text-slate-400">Prix direct</div>
              <div className="font-black text-slate-900">{formatToastPrice(promoPrice, currency)}</div>
            </div>
          </div>

          {/* Raccourcis d'offres rapides en pourcentage (-10%, -15%, -20%, -30%) */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Suggestions rapides
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[10, 15, 20, 30].map((pct) => {
                const targetPrice = Math.round((promoPrice * (100 - pct)) / 100 / 100) * 100;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPercentDiscount(pct)}
                    className="py-1.5 px-1 rounded-lg bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 active:scale-95 transition text-center cursor-pointer shadow-2xs"
                  >
                    <div className="text-[11px] font-black text-amber-600">-{pct}%</div>
                    <div className="text-[9px] font-bold text-slate-600 truncate">
                      {targetPrice.toLocaleString('fr-FR')}F
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input Stylisé pour le prix proposé */}
          <form onSubmit={handleSubmitOffer} className="space-y-2">
            <div className="relative">
              <label htmlFor="smart-haggle-price-input" className="sr-only">
                Votre prix proposé en FCFA
              </label>
              <div className="flex items-center bg-white border-2 border-amber-400/80 focus-within:border-amber-500 rounded-xl px-3 py-2 shadow-inner">
                <input
                  id="smart-haggle-price-input"
                  ref={numericInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={
                    keypadInput
                      ? parseInt(keypadInput, 10).toLocaleString('fr-FR')
                      : ''
                  }
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setKeypadInput(clean);
                    setOfferError(null);
                  }}
                  placeholder="Tapez votre prix..."
                  className="w-full text-center text-xl sm:text-2xl font-black text-slate-900 bg-transparent outline-none placeholder-slate-300"
                />
                <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md shrink-0 border border-amber-200">
                  {currency}
                </span>
                {keypadInput && (
                  <button
                    type="button"
                    onClick={() => setKeypadInput('')}
                    className="ml-1 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title="Effacer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Message d'erreur de saisie */}
            {offerError && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{offerError}</span>
              </div>
            )}

            {/* Mini-clavier tactile compact */}
            <div className="bg-slate-50/80 border border-slate-200/80 p-1.5 rounded-xl">
              <div className="grid grid-cols-3 gap-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'BACK'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypadPress(key)}
                    className="py-2 sm:py-2.5 rounded-lg bg-white hover:bg-slate-100 active:bg-amber-100 active:scale-95 text-slate-900 text-sm font-black shadow-2xs border border-slate-200/80 transition cursor-pointer select-none"
                  >
                    {key === 'BACK' ? '⌫' : key}
                  </button>
                ))}
              </div>
            </div>

            {/* Bouton de validation de l'offre */}
            <button
              type="submit"
              disabled={isAiThinking || !keypadInput || parseInt(keypadInput, 10) <= 0}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:opacity-50 active:scale-98 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-400/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isAiThinking ? (
                <>
                  <Bot className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Négociation IA en direct...</span>
                </>
              ) : (
                <>
                  <Handshake className="w-4 h-4" />
                  <span>
                    Valider l'offre de{' '}
                    {keypadInput ? `${parseInt(keypadInput, 10).toLocaleString('fr-FR')} ${currency}` : ''} 🚀
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          ÉTAT 3 : 'counter_offer' — LA BULLE DE CONTRE-OFFRE & COMPOSANT FOMO
          - Bulle de chat privée temporaire par-dessus le Live
          - Phrase : "À 15 000F c'est compliqué, mais je te le laisse à 17 500F !"
          - Barre de progression rouge agressive qui se vide en 2 minutes
          - Bouton d'acceptation vert vibrant
         ===================================================================== */}
      {negotiationState === 'counter_offer' && (
        <div className="space-y-3 animate-in zoom-in-95 duration-200">
          {/* En-tête de la Bulle Privée */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Lock className="w-2.5 h-2.5 text-emerald-600" />
                <span>Négociation Privée en Direct</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetToIdle}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="Fermer la contre-offre"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* LA BULLE DE CHAT PRIVÉE DE L'IA (Le coup de génie) */}
          <div className="flex items-start gap-2.5">
            {/* Avatar IA Négociateur */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md border-2 border-white">
                <Bot className="w-5 h-5 text-slate-950" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 border border-white w-2.5 h-2.5 rounded-full" />
            </div>

            {/* Bulle stylisée par-dessus le Live */}
            <div className="flex-1 relative bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white p-3 sm:p-3.5 rounded-2xl rounded-tl-xs shadow-xl border border-amber-400/40">
              {/* Petite flèche indicatrice de chat */}
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-1 flex items-center justify-between">
                <span>IA Vendeur Wameet</span>
                <span className="text-[9px] text-slate-400 font-semibold">Chuchotement direct</span>
              </div>

              {/* Texte de la Contre-Offre au mot près */}
              <p className="text-xs sm:text-sm font-black leading-snug text-amber-200">
                {aiMessage ||
                  `À ${offeredPrice?.toLocaleString('fr-FR')}F c'est compliqué, mais je te le laisse à ${counterPrice?.toLocaleString('fr-FR')}F !`}
              </p>

              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-300">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Offre exceptionnelle réservée à toi pendant le Live.</span>
              </div>
            </div>
          </div>

          {/* =================================================================
              COMPOSANT FOMO (URGENCE)
              - Compte à rebours agressif (barre de progression rouge qui se vide en 2 min)
              - Bouton d'acceptation vert
             ================================================================= */}
          <div className="bg-red-50/80 border border-red-200/80 rounded-xl p-2.5 space-y-2">
            {/* Indicateur textuel du chrono FOMO */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 font-black text-red-700 uppercase tracking-tight">
                <Flame className="w-4 h-4 text-red-600 animate-bounce" />
                <span>Offre Flash Spéciale</span>
              </div>
              <div className="flex items-center gap-1 font-black text-red-600 font-mono text-sm bg-white px-2 py-0.5 rounded-md border border-red-200 shadow-2xs">
                <Clock className="w-3 h-3 text-red-500 animate-pulse" />
                <span>{formattedCountdown}</span>
              </div>
            </div>

            {/* Barre de progression rouge très agressive */}
            <div className="w-full bg-red-200/70 h-2.5 rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(220,38,38,0.7)] ${
                  timeRemaining < 20 ? 'animate-pulse' : ''
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Bouton d'acceptation vert vif */}
            <button
              type="button"
              onClick={handleAcceptCounterOffer}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-600 active:scale-98 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Check className="w-4 h-4 text-white stroke-[3]" />
              <span>Accepter l'offre à {formatToastPrice(counterPrice ?? 0, currency)} ⚡</span>
            </button>

            {/* Actions secondaires : Refuser ou ré-essayer */}
            <div className="flex items-center justify-between pt-0.5 text-[11px]">
              <button
                type="button"
                onClick={handleResetToIdle}
                className="text-slate-500 hover:text-slate-800 font-bold transition cursor-pointer"
              >
                Refuser l'offre
              </button>
              <button
                type="button"
                onClick={() => updateState('offering')}
                className="text-amber-700 hover:text-amber-900 font-black transition cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Autre contre-proposition</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ÉTAT 4 : 'expired' — EXPIRATION DE L'OFFRE (BOUTON GRISÉ)
          - Le compte à rebours est écoulé
          - Le bouton devient grisé et inactif
         ===================================================================== */}
      {negotiationState === 'expired' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Délai Dépassé</span>
            </span>

            <button
              type="button"
              onClick={handleResetToIdle}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Alerte d'expiration */}
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-center space-y-1">
            <div className="text-xl">⌛</div>
            <div className="text-xs font-black text-slate-800">Offre Spéciale Expirée</div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Le délai de 2 minutes pour la contre-offre à{' '}
              <strong className="text-slate-700">{formatToastPrice(counterPrice ?? 0, currency)}</strong> est écoulé.
              Le produit est revenu à son prix de vente standard.
            </p>
          </div>

          {/* Bouton d'acceptation grisé et désactivé */}
          <button
            type="button"
            disabled
            className="w-full py-2.5 px-4 rounded-xl bg-slate-200 text-slate-400 font-bold text-xs sm:text-sm border border-slate-300 cursor-not-allowed flex items-center justify-center gap-2 shadow-none select-none"
          >
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Offre expirée ({formatToastPrice(counterPrice ?? 0, currency)})</span>
          </button>

          {/* Boutons de relance */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => updateState('offering')}
              className="py-2 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-black text-xs transition cursor-pointer text-center"
            >
              Réessayer une offre 🤝
            </button>
            <button
              type="button"
              onClick={handleClassicBuy}
              className="py-2 px-2 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-xs transition cursor-pointer text-center"
            >
              Acheter au prix normal
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          ÉTAT 5 : 'accepted' — MARCHÉ CONCLU (SUCCÈS)
          - Offre validée et enregistrée
          - Redirection immédiate vers le tunnel d'achat
         ===================================================================== */}
      {negotiationState === 'accepted' && (
        <div className="space-y-3 animate-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-3 text-white shadow-lg space-y-1 text-center">
            <div className="inline-flex p-1.5 bg-white/20 rounded-full mb-0.5">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="text-sm font-black">🎉 Affaire Conclue !</div>
            <p className="text-xs text-emerald-100">
              Votre offre à{' '}
              <span className="font-black text-white underline decoration-white/60">
                {formatToastPrice(counterPrice ?? 0, currency)}
              </span>{' '}
              est confirmée !
            </p>
          </div>

          {/* Bouton de finalisation d'achat immédiat */}
          <button
            type="button"
            onClick={handleFinalizeNegotiatedPurchase}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-black active:scale-98 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>Payer en 1 clic à {formatToastPrice(counterPrice ?? 0, currency)} 🚀</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default formatToastPrice;
