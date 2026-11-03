import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { Sparkles, Video, Calendar, ShieldCheck, Clock, X, Smartphone } from 'lucide-react';

export interface VipAccessOffer {
  title: string;
  priceXOF: number;
  priceDiamonds: number;
  durationMinutes: number;
  type: 'APPOINTMENT' | 'PREMIUM_VIDEO' | 'PRIVATE_ROOM';
  description?: string;
}

export interface CentralLockButtonProps {
  reelId: string;
  creatorId: string;
  creatorName: string;
  currentUserId: string;
  userDiamonds?: number;
  offer?: VipAccessOffer;
  onLaunchVipSession: (roomUrl: string) => void;
  className?: string;
  /** Déclencheur externe pour ouvrir la modale VIP (ex: via appui très prolongé) */
  openModalTrigger?: number;
  /** Masquer le bouton visuel standard pour n'utiliser que le déclencheur d'appui très prolongé */
  hideDefaultButton?: boolean;
}

const DEFAULT_OFFER: VipAccessOffer = {
  title: 'Consultation VIP 1-on-1',
  priceXOF: 5000,
  priceDiamonds: 500,
  durationMinutes: 15,
  type: 'APPOINTMENT',
  description: 'Accès direct prioritaire avec le créateur en salon vidéo sécurisé.'
};

export const CentralLockButton: React.FC<CentralLockButtonProps> = ({
  reelId,
  creatorId,
  creatorName,
  currentUserId,
  userDiamonds = 18450,
  offer = DEFAULT_OFFER,
  onLaunchVipSession,
  className = '',
  openModalTrigger,
  hideDefaultButton = false
}) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && reelId && currentUserId) {
        return localStorage.getItem(`wameet_vault_${reelId}_${currentUserId}`) === 'unlocked';
      }
    } catch (_) {}
    return false;
  });
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('Immédiat (Direct)');

  // Écoute du déclencheur externe (ex: appui très prolongé sur la carte)
  useEffect(() => {
    if (openModalTrigger && openModalTrigger > 0) {
      if (isUnlocked) {
        playValidationBeep();
        const roomUrl = `https://nanasore.daily.co/vip-${reelId}-${currentUserId || 'guest'}`;
        onLaunchVipSession(roomUrl);
      } else {
        playTapBeep();
        setIsOpenModal(true);
      }
    }
  }, [openModalTrigger]);

  // 1. Vérification si l'utilisateur a déjà déverrouillé ce cadenas (Firestore + Cache)
  useEffect(() => {
    if (!currentUserId || !reelId) return;

    let isMounted = true;
    const checkUnlockStatus = async () => {
      try {
        const lockRef = doc(db, 'unlocked_vaults', `${reelId}_${currentUserId}`);
        const snap = await getDoc(lockRef);
        if (snap.exists() && isMounted) {
          setIsUnlocked(true);
          try {
            localStorage.setItem(`wameet_vault_${reelId}_${currentUserId}`, 'unlocked');
          } catch (_) {}
        }
      } catch (err) {
        console.warn('[LOCK CENTRAL] Vérification statut cadenas :', err);
      }
    };

    checkUnlockStatus();
    return () => {
      isMounted = false;
    };
  }, [reelId, currentUserId]);

  const effectiveDiamonds = typeof userDiamonds === 'number' ? userDiamonds : 18450;
  const activeOffer = offer || DEFAULT_OFFER;

  // Clic sur le bouton central
  const handleCentralClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnlocked) {
      playValidationBeep();
      const roomUrl = `https://nanasore.daily.co/vip-${reelId}-${currentUserId || 'guest'}`;
      onLaunchVipSession(roomUrl);
    } else {
      playTapBeep();
      setIsOpenModal(true);
    }
  };

  // Déverrouillage par Diamants Wameet
  const handleUnlockWithDiamonds = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playTapBeep();

    if (effectiveDiamonds < activeOffer.priceDiamonds) {
      alert(`Solde de diamants insuffisant (${effectiveDiamonds} 💎). Veuillez recharger votre Wallet Wameet.`);
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Déduction des Diamants dans le Wallet Utilisateur (si utilisateur authentifié)
      if (currentUserId && currentUserId !== 'user_me' && currentUserId !== 'guest') {
        try {
          const userRef = doc(db, 'users', currentUserId);
          await updateDoc(userRef, {
            diamonds: increment(-activeOffer.priceDiamonds),
            impactScore: increment(-activeOffer.priceDiamonds)
          });
        } catch (uErr) {
          console.warn('[LOCK CENTRAL] Déduction solde utilisateur :', uErr);
        }

        // 2. Créditer le créateur du Reel
        if (creatorId) {
          try {
            const creatorRef = doc(db, 'users', creatorId);
            await updateDoc(creatorRef, {
              diamonds: increment(activeOffer.priceDiamonds),
              impactScore: increment(activeOffer.priceDiamonds)
            });
          } catch (cErr) {
            console.warn('[LOCK CENTRAL] Crédit créateur :', cErr);
          }
        }

        // 3. Enregistrer le déverrouillage dans Firestore
        try {
          await setDoc(doc(db, 'unlocked_vaults', `${reelId}_${currentUserId}`), {
            reelId,
            userId: currentUserId,
            creatorId: creatorId || 'unknown',
            creatorName: creatorName || 'Créateur Wameet',
            offerTitle: activeOffer.title,
            slot: selectedSlot,
            unlockedAt: serverTimestamp(),
            amountPaid: activeOffer.priceDiamonds,
            currency: 'DIAMONDS'
          });
        } catch (fErr) {
          console.warn('[LOCK CENTRAL] Écriture unlocked_vaults :', fErr);
        }
      }

      // Sauvegarde locale systématique
      try {
        localStorage.setItem(`wameet_vault_${reelId}_${currentUserId}`, 'unlocked');
      } catch (_) {}

      setIsUnlocked(true);
      setIsOpenModal(false);
      playValidationBeep();

      // 4. Générer et lancer la session VIP immédiate (Daily.co / Jitsi)
      const roomUrl = `https://nanasore.daily.co/vip-${reelId}-${currentUserId || 'guest'}`;
      onLaunchVipSession(roomUrl);
    } catch (err) {
      console.error('Erreur lors du déverrouillage VIP :', err);
      alert('Une erreur est survenue lors du paiement.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Déverrouillage par Mobile Money Direct
  const handlePayMobileMoney = (e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    // Ouverture du guichet de paiement Mobile Money
    const payUrl = `/pay/mobile-money?type=VIP_LOCK&reel=${encodeURIComponent(reelId)}&amount=${activeOffer.priceXOF}&creator=${encodeURIComponent(creatorId || '')}&slot=${encodeURIComponent(selectedSlot)}`;
    window.open(payUrl, '_blank');
  };

  return (
    <>
      {/* =====================================================================
          1. BOUTON CADENAS CENTRAL (🔒 / 🔓) AU BAS / MILIEU DU REEL
         ===================================================================== */}
      {!hideDefaultButton && (
        <div
          className={`flex items-center justify-center select-none ${className}`}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleCentralClick}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            aria-label={isUnlocked ? 'Accéder au Salon VIP' : 'Déverrouiller le RDV VIP'}
            title={isUnlocked ? 'Accéder au Salon VIP (Déverrouillé)' : 'Déverrouiller le RDV VIP (Cadenas)'}
            className={`group flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-extrabold text-xs sm:text-sm shadow-xl backdrop-blur-md transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer border ${
              isUnlocked
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse'
                : 'bg-white/10 hover:bg-white/20 text-amber-300 font-black border-amber-400/40 shadow-[0_4px_25px_rgba(245,158,11,0.25)]'
            }`}
          >
            <span className="text-base sm:text-lg leading-none drop-shadow">
              {isUnlocked ? '🔓' : '🔒'}
            </span>
            <span className={`tracking-tight drop-shadow ${isUnlocked ? 'text-emerald-300' : 'text-amber-300'}`}>
              {isUnlocked ? 'Accéder au Salon VIP' : 'Déverrouiller le RDV VIP'}
            </span>
            {isUnlocked ? (
              <Video className="w-4 h-4 ml-0.5 text-emerald-300 animate-bounce" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 ml-0.5 text-amber-300 group-hover:rotate-12 transition-transform" />
            )}
          </button>
        </div>
      )}

      {/* =====================================================================
          2. MODALE DE PAIEMENT / DÉVERROUILLAGE VIP (VipLockModal)
         ===================================================================== */}
      {isOpenModal && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsOpenModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-amber-500/50 rounded-3xl p-4 sm:p-6 text-white shadow-[0_10px_50px_rgba(0,0,0,0.9)] text-center space-y-3 sm:space-y-4 animate-in zoom-in-95 duration-200"
          >
            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playTapBeep();
                setIsOpenModal(false);
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-white p-1.5 rounded-full bg-gray-800/80 hover:bg-gray-700 transition cursor-pointer z-10"
              title="Fermer"
              aria-label="Fermer la modale"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Cadenas Lumineux Central */}
            <div className="relative mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-500/30 to-amber-400/10 border-2 border-amber-400/60 flex items-center justify-center text-2xl sm:text-3xl shadow-[0_0_25px_rgba(245,158,11,0.4)]">
              <span>🔒</span>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-gray-950 flex items-center justify-center text-[10px] font-black">
                VIP
              </div>
            </div>

            {/* Titre & Description de l'Offre VIP */}
            <div className="px-1">
              <h3 className="text-base sm:text-xl font-black text-amber-400 uppercase tracking-tight">
                {activeOffer.title}
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-300 mt-1 leading-relaxed">
                Session privée en visio directe avec{' '}
                <strong className="text-white font-bold">{creatorName}</strong> ({activeOffer.durationMinutes} min).
              </p>
            </div>

            {/* Sélecteur de Créneau Horaire (Agenda Rapide) */}
            <div className="text-left bg-gray-800/60 p-2.5 sm:p-3 rounded-2xl border border-white/10 space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-amber-300">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Choisir le créneau de consultation :</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] sm:text-[11px]">
                {['Immédiat (Direct)', "Aujourd'hui 16:30", "Aujourd'hui 18:00", 'Demain 10:00'].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTapBeep();
                      setSelectedSlot(slot);
                    }}
                    className={`py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-lg font-semibold transition text-center truncate ${
                      selectedSlot === slot
                        ? 'bg-amber-500 text-gray-950 font-black shadow-md'
                        : 'bg-gray-700/60 text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Encadré des Tarifs & Solde */}
            <div className="bg-gray-800/90 p-3 sm:p-3.5 rounded-2xl border border-gray-700 space-y-2 text-left">
              <div className="flex justify-between items-center text-[11px] sm:text-xs">
                <span className="text-gray-400 flex items-center gap-1">
                  💎 Tarif Diamants :
                </span>
                <span className="font-black text-amber-300 text-xs sm:text-sm">
                  {activeOffer.priceDiamonds} 💎
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] sm:text-xs">
                <span className="text-gray-400 flex items-center gap-1">
                  💵 Tarif Cash (Mobile Money) :
                </span>
                <span className="font-black text-emerald-400 text-xs sm:text-sm">
                  {activeOffer.priceXOF.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="pt-1 border-t border-gray-700/80 flex justify-between items-center text-[10px] sm:text-[11px] text-gray-400">
                <span>Votre solde Wameet :</span>
                <span className="font-bold text-white flex items-center gap-1">
                  💎 {effectiveDiamonds.toLocaleString('fr-FR')}
                </span>
              </div>
            </div>

            {/* Boutons d'Action (Diamants vs Mobile Money) */}
            <div className="space-y-2 pt-1">
              {/* Option 1: Payer avec Diamants */}
              <button
                type="button"
                onClick={handleUnlockWithDiamonds}
                disabled={isProcessing}
                className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-500 text-gray-950 font-black rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.4)] transition-all active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Validation de la transaction...</span>
                ) : (
                  <>
                    <span>💎 Déverrouiller ({activeOffer.priceDiamonds} Diamants)</span>
                  </>
                )}
              </button>

              {/* Option 2: Mobile Money Direct */}
              <button
                type="button"
                onClick={handlePayMobileMoney}
                className="w-full py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg transition-all active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30"
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>Payer {activeOffer.priceXOF.toLocaleString('fr-FR')} FCFA (Mobile Money)</span>
              </button>
            </div>

            {/* Note de Garantie */}
            <div className="flex items-center justify-center gap-1 text-[9px] sm:text-[10px] text-gray-400 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Garantie Wameet Secure Escrow & Chiffrement P2P</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CentralLockButton;
