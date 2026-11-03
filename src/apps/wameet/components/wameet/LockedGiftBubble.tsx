import React, { useState, useCallback } from 'react';
import {
  Gift,
  Sparkles,
  MapPin,
  Clock,
  Heart,
  Store,
  ChevronRight,
  RotateCcw,
  Navigation,
  CheckCircle2,
  Bike
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  GeolocationConsentModal
} from './GeolocationConsentModal';
import {
  GeolocationCoordinatesData
} from '../../../../hooks/useMysteryGiftGeolocation';
import { playValidationBeep, playTapBeep } from '../../../../utils/audio';

export interface MysteryGiftProduct {
  id?: string;
  title: string;
  price?: number | string;
  currency?: string;
  imageUrl: string;
  merchantName: string;
  category?: string;
  deliveryEta?: string;
  description?: string;
}

export interface LockedGiftBubbleProps {
  /**
   * Nom de l'expéditeur du cadeau (par défaut 'Ibrahim')
   */
  senderName?: string;
  /**
   * Avatar de l'expéditeur (optionnel)
   */
  senderAvatar?: string;
  /**
   * Nom du destinataire (optionnel)
   */
  recipientName?: string;
  /**
   * Informations sur le produit physique réel révélé
   */
  giftProduct?: Partial<MysteryGiftProduct>;
  /**
   * État initialement déverrouillé (ex: pour rechargement d'historique)
   */
  isInitiallyUnlocked?: boolean;
  /**
   * Callback déclenché lors du déverrouillage avec les coordonnées GPS acquises
   */
  onUnlocked?: (coords: GeolocationCoordinatesData) => void;
  /**
   * Callback au clic sur "Suivre le livreur"
   */
  onTrackDelivery?: (coords: GeolocationCoordinatesData | null) => void;
  /**
   * Callback au clic sur "Remercier l'expéditeur"
   */
  onThankSender?: (senderName: string) => void;
  /**
   * Alignement dans le chat (true: envoyé par moi à droite, false: reçu à gauche)
   */
  isMe?: boolean;
  /**
   * Horodatage du message
   */
  timestamp?: string;
  /**
   * Classe CSS additionnelle
   */
  className?: string;
}

// Produit par défaut ultra-gourmand pour respecter la directive ("ex: Gâteau d'anniversaire")
const DEFAULT_GIFT_PRODUCT: MysteryGiftProduct = {
  id: 'cake-birthday-signature',
  title: "Gâteau d'anniversaire Signature",
  price: 15000,
  currency: 'FCFA',
  imageUrl:
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=800&auto=format&fit=crop',
  merchantName: 'NaNa POS',
  category: 'Pâtisserie Prestige',
  deliveryEta: '18 - 25 min',
  description: 'Chocolat noir intense, crème veloutée & fraises fraîches de saison.'
};

/**
 * Lance une explosion de confettis festifs pour célébrer l'ouverture du cadeau
 */
function triggerGiftConfetti() {
  try {
    // Premier jet festif central
    confetti({
      particleCount: 80,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#ec4899', '#f59e0b', '#3b82f6', '#10b981'],
      disableForReducedMotion: true
    });

    // Étoiles dorées scintillantes
    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0.2, y: 0.65 },
        colors: ['#fbbf24', '#f43f5e', '#a855f7']
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 0.8, y: 0.65 },
        colors: ['#fbbf24', '#f43f5e', '#a855f7']
      });
    }, 200);
  } catch (e) {
    console.warn('Confetti error:', e);
  }
}

/**
 * COMPOSANT LockedGiftBubble / MysteryGiftBubble (Wameet CRM & Smart Actions)
 * Directives UI/UX au millimètre :
 * 1. État Verrouillé : Carte carrée, fond flou extrême (backdrop-blur-xl bg-pink-50/50),
 *    emoji 🎁 animé (animate-bounce), texte "Ibrahim vous a envoyé un cadeau surprise !",
 *    gros bouton rouge "Révéler & Accepter le cadeau".
 * 2. Demande GPS : Modale ultra-clean "Pour recevoir ce cadeau physique, le livreur a besoin de votre position. [Partager ma position]".
 * 3. État Déverrouillé : Flip card 3D rotate-y-180 CSS3, photo du produit réel (ex: Gâteau d'anniversaire),
 *    nom de la boutique NaNa POS, statut "Livreur en route vers vous 🛵".
 */
export const LockedGiftBubble: React.FC<LockedGiftBubbleProps> = ({
  senderName = 'Ibrahim',
  senderAvatar,
  recipientName,
  giftProduct,
  isInitiallyUnlocked = false,
  onUnlocked,
  onTrackDelivery,
  onThankSender,
  isMe = false,
  timestamp,
  className = ''
}) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(isInitiallyUnlocked);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [capturedLocation, setCapturedLocation] = useState<GeolocationCoordinatesData | null>(null);
  const [hasThanked, setHasThanked] = useState<boolean>(false);

  // Fusion du produit avec les valeurs par défaut
  const product: MysteryGiftProduct = {
    ...DEFAULT_GIFT_PRODUCT,
    ...giftProduct,
    merchantName: giftProduct?.merchantName || DEFAULT_GIFT_PRODUCT.merchantName
  };

  /**
   * Clic sur "Révéler & Accepter le cadeau" -> Ouvre la modale GPS
   */
  const handleRevealClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      playTapBeep();
    } catch {}
    setIsModalOpen(true);
  };

  /**
   * Position validée par l'API HTML5 Geolocation -> Active le retournement 3D
   */
  const handleConsentGranted = useCallback(
    (coords: GeolocationCoordinatesData) => {
      setCapturedLocation(coords);
      setIsUnlocked(true);

      // Déclenche l'explosion de confettis
      triggerGiftConfetti();

      // Retour haptique et sonore
      try {
        playValidationBeep();
      } catch {}

      if (onUnlocked) {
        onUnlocked(coords);
      }
    },
    [onUnlocked]
  );

  /**
   * Action de remerciement pour l'expéditeur
   */
  const handleThankClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasThanked(true);
    try {
      playValidationBeep();
    } catch {}
    if (onThankSender) {
      onThankSender(senderName);
    }
  };

  /**
   * Flip manuel pour tester à nouveau l'animation
   */
  const handleToggleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUnlocked((prev) => !prev);
  };

  // Coins asymétriques selon le sens du message dans le chat Wameet
  const chatBubbleAlign = isMe ? 'ml-auto items-end' : 'mr-auto items-start';

  return (
    <>
      <div className={`flex flex-col ${chatBubbleAlign} ${className}`}>
        {/* =====================================================================
            CONTENEUR 3D FLIP CARD (Perspective 1200px & Format Carré)
           ===================================================================== */}
        <div
          className="relative w-[300px] h-[340px] sm:w-[320px] sm:h-[350px] select-none perspective-1200 group"
          style={{ perspective: '1200px' }}
        >
          {/* CARTE ROTATIVE 3D */}
          <div
            className={`relative w-full h-full rounded-3xl transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform-style-3d shadow-xl ${
              isUnlocked ? 'rotate-y-180' : 'rotate-y-0'
            }`}
            style={{
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              transform: isUnlocked ? 'rotateY(180deg)' : 'rotateY(0deg)',
              WebkitTransform: isUnlocked ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* ---------------------------------------------------------------
                1. FACE AVANT : ÉTAT VERROUILLÉ (LE SUSPENSE)
                Directive : Carte carrée, fond flou extrême (backdrop-blur-xl bg-pink-50/50),
                emoji 🎁 animé (animate-bounce), texte "Ibrahim vous a envoyé un cadeau surprise !",
                gros bouton rouge "Révéler & Accepter le cadeau".
               --------------------------------------------------------------- */}
            <div
              className="absolute inset-0 w-full h-full rounded-3xl backdrop-blur-xl bg-pink-50/50 border border-pink-200/70 dark:border-pink-500/20 shadow-lg p-5 flex flex-col justify-between items-center text-center overflow-hidden backface-hidden"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              {/* Halos d'ambiance rose féerique */}
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-pink-400/20 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-rose-400/20 blur-2xl pointer-events-none" />

              {/* Badge d'en-tête discret */}
              <div className="relative z-10 w-full flex items-center justify-between text-[11px] font-bold text-pink-700 dark:text-pink-300">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-pink-200/60 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-pink-500 animate-pulse" />
                  <span>Cadeau Mystère Wameet</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-pink-500/80 font-black">
                  Exclusif
                </span>
              </div>

              {/* Zone centrale : Émoji 🎁 animé avec effet de lévitation et socle */}
              <div className="relative z-10 my-auto flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  {/* Ombre portée pulsante au sol */}
                  <div className="absolute -bottom-2 w-16 h-3 rounded-full bg-pink-400/25 blur-[3px] scale-90 animate-pulse" />

                  {/* Gros emoji 🎁 animé animate-bounce */}
                  <div
                    className="text-6xl sm:text-7xl animate-bounce filter drop-shadow-md select-none transform transition-transform hover:scale-110 cursor-pointer"
                    role="img"
                    aria-label="Cadeau Mystère"
                    onClick={handleRevealClick}
                    style={{ animationDuration: '1.4s' }}
                  >
                    🎁
                  </div>
                </div>

                {/* TEXTE STRICT DE LA DIRECTIVE PROMPT 22 */}
                <h4 className="mt-3 text-sm sm:text-[15px] font-extrabold text-slate-800 dark:text-slate-100 leading-snug tracking-tight px-1 max-w-[260px]">
                  {senderName} vous a envoyé un cadeau surprise !
                </h4>

                <p className="mt-1 text-[11px] text-pink-600 dark:text-pink-400 font-medium">
                  Livraison physique à domicile en attente
                </p>
              </div>

              {/* ACTION STRICTE DE LA DIRECTIVE : GROS BOUTON ROUGE */}
              <div className="relative z-10 w-full pt-1">
                <button
                  type="button"
                  onClick={handleRevealClick}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-red-500/35 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer border border-red-400/40"
                >
                  <Gift className="w-4 h-4 shrink-0" />
                  <span>Révéler & Accepter le cadeau</span>
                </button>
              </div>
            </div>

            {/* ---------------------------------------------------------------
                2. FACE ARRIÈRE : ÉTAT DÉVERROUILLÉ (L'OUVERTURE)
                Directive : Bulle retournée (rotate-y-180 CSS3), photo du produit
                réel (ex: Gâteau d'anniversaire), nom de la boutique NaNa POS,
                statut de livraison "Livreur en route vers vous 🛵".
               --------------------------------------------------------------- */}
            <div
              className="absolute inset-0 w-full h-full rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 shadow-xl p-4 flex flex-col justify-between overflow-hidden backface-hidden rotate-y-180"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                WebkitTransform: 'rotateY(180deg)'
              }}
            >
              {/* Badge Débloqué & Bouton de bascule */}
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold tracking-wide uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Cadeau Débloqué 🎉</span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleFlip}
                  title="Revoir le suspense"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* PHOTO DU PRODUIT RÉEL (ex: Gâteau d'anniversaire) */}
              <div className="relative w-full h-28 sm:h-32 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 shadow-inner group/img">
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  loading="eager"
                  className="w-full h-full object-cover transform group-hover/img:scale-105 transition-transform duration-300"
                />

                {/* Overlay dégradé inférieur */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {/* Titre du produit sur l'image */}
                <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
                  <h5 className="text-xs sm:text-sm font-extrabold truncate drop-shadow-sm">
                    {product.title}
                  </h5>
                </div>
              </div>

              {/* INFORMATIONS : NOM DE LA BOUTIQUE NANA POS & PRIX */}
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                    <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{product.merchantName}</span>
                  </div>

                  {product.price && (
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 shrink-0">
                      Offert • {Number(product.price).toLocaleString('fr-FR')} {product.currency || 'FCFA'}
                    </span>
                  )}
                </div>

                {/* STATUT DE LIVRAISON STRICT : "Livreur en route vers vous 🛵" */}
                <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200/80 dark:border-emerald-800/80">
                  <div className="flex items-center gap-2">
                    {/* Badge Pulsant */}
                    <div className="relative flex items-center justify-center shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 relative" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-black text-emerald-900 dark:text-emerald-200 truncate flex items-center gap-1">
                          <span>Livreur en route vers vous 🛵</span>
                        </p>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                          ~{product.deliveryEta}
                        </span>
                      </div>

                      {capturedLocation?.formattedCoords && (
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400/90 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span>GPS : {capturedLocation.formattedCoords}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTIONS COMPLÉMENTAIRES (Remerciement & Suivi) */}
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleThankClick}
                  disabled={hasThanked}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    hasThanked
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
                      : 'bg-rose-500 hover:bg-rose-600 text-white shadow-xs'
                  }`}
                >
                  <Heart className={`w-3 h-3 ${hasThanked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{hasThanked ? 'Remercié ❤️' : `Remercier ${senderName}`}</span>
                </button>

                {onTrackDelivery && (
                  <button
                    type="button"
                    onClick={() => onTrackDelivery(capturedLocation)}
                    className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Suivi</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timestamp discret sous la bulle */}
        {timestamp && (
          <span className="text-[10px] text-slate-400 mt-1 px-1">
            {timestamp}
          </span>
        )}
      </div>

      {/* =======================================================================
          MODALE DU CONSENTEMENT GPS (API HTML5 navigator.geolocation)
         ======================================================================= */}
      <GeolocationConsentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConsentGranted={handleConsentGranted}
        senderName={senderName}
        merchantName={product.merchantName}
      />
    </>
  );
};

// Alias export pour conformité totale avec les deux dénominations
export const MysteryGiftBubble = LockedGiftBubble;

export default LockedGiftBubble;
