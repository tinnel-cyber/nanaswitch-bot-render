import React, { useState, useEffect } from 'react';
import { doc, updateDoc, increment, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Radio } from 'lucide-react';
import { db } from '../../../../firebase';
import { playValidationBeep } from '../../../../utils/audio';
import { createSynergyMatchRoom } from '../../../../services/dailyVideoService';

export interface ResonanceButtonProps {
  reelId: string;
  creatorId: string;
  currentUserId: string;
  currentUserName: string;
  initialResonanceCount?: number;
  onSynergyMatchTriggered: (roomUrl: string) => void;
  className?: string;
}

/**
 * Bouton 1 - La Résonance (📡)
 * 1. Enregistre l'action de résonance dans Firestore (collection 'resonances').
 * 2. Incrémente le compteur de résonances du Reel (collection 'reels' ou 'wameet_reels').
 * 3. Envoie une notification Push FCM instantanée au créateur : "{userName} a fait résonner votre Reel !".
 * 4. Détecte la Résonance Mutuelle (Synergy Match) et déclenche l'URL de visio instantanée.
 * 5. Animation d'onde pulsante concentrique et couleur Bleu Royal #4169E1.
 */
export const ResonanceButton: React.FC<ResonanceButtonProps> = ({
  reelId,
  creatorId,
  currentUserId,
  currentUserName,
  initialResonanceCount = 0,
  onSynergyMatchTriggered,
  className = ''
}) => {
  const [hasResonated, setHasResonated] = useState<boolean>(false);
  const [count, setCount] = useState<number>(initialResonanceCount);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  useEffect(() => {
    // Vérification initiale si l'utilisateur a déjà résonné
    const checkStatus = async () => {
      if (!currentUserId || !reelId) return;
      try {
        const resRef = doc(db, 'resonances', `${reelId}_${currentUserId}`);
        const snap = await getDoc(resRef);
        if (snap.exists()) {
          setHasResonated(true);
        } else {
          // Vérification dans le stockage local de secours
          const localSaved = localStorage.getItem(`res_${reelId}_${currentUserId}`);
          if (localSaved === 'true') setHasResonated(true);
        }
      } catch (err) {
        const localSaved = localStorage.getItem(`res_${reelId}_${currentUserId}`);
        if (localSaved === 'true') setHasResonated(true);
      }
    };
    checkStatus();
  }, [reelId, currentUserId]);

  const handleResonance = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUserId || hasResonated) return;

    playValidationBeep();
    setIsAnimating(true);
    setHasResonated(true);
    setCount(prev => prev + 1);

    try {
      try {
        localStorage.setItem(`res_${reelId}_${currentUserId}`, 'true');
      } catch (_) {}

      // 1. Enregistrement de la résonance
      const resonanceId = `${reelId}_${currentUserId}`;
      await setDoc(doc(db, 'resonances', resonanceId), {
        reelId,
        userId: currentUserId,
        userName: currentUserName || 'Utilisateur Wameet',
        creatorId: creatorId || 'creator_anonymous',
        timestamp: serverTimestamp()
      }, { merge: true });

      // Enregistrement de la paire pour détection mutuelle instantanée
      if (creatorId) {
        await setDoc(doc(db, 'resonances', `${currentUserId}_${creatorId}`), {
          reelId,
          userId: currentUserId,
          creatorId,
          timestamp: serverTimestamp()
        }, { merge: true }).catch(() => {});
      }

      // 2. Mise à jour du compteur sur le Reel
      try {
        const reelRef = doc(db, 'reels', reelId);
        await updateDoc(reelRef, {
          resonanceCount: increment(1)
        });
      } catch (_) {
        try {
          const wameetReelRef = doc(db, 'wameet_reels', reelId);
          await updateDoc(wameetReelRef, {
            resonanceCount: increment(1)
          });
        } catch (e) {
          console.warn("[RESONANCE] Compteur local synchronisé :", e);
        }
      }

      // 3. Vérification du Synergy Match (Si le créateur a aussi résonné avec l'utilisateur)
      let isMatch = false;
      if (creatorId && creatorId !== currentUserId) {
        try {
          // A. Vérification de l'enregistrement inverse ${creatorId}_${currentUserId}
          const mutualCheckRef1 = doc(db, 'resonances', `${creatorId}_${currentUserId}`);
          const mutualSnap1 = await getDoc(mutualCheckRef1);
          if (mutualSnap1.exists()) {
            isMatch = true;
          } else {
            // B. Vérification de l'enregistrement de format ${currentUserId}_${creatorId}
            const mutualCheckRef2 = doc(db, 'resonances', `${currentUserId}_${creatorId}`);
            const mutualSnap2 = await getDoc(mutualCheckRef2);
            if (mutualSnap2.exists() && mutualSnap2.data()?.userId === creatorId) {
              isMatch = true;
            }
          }
        } catch (err) {
          console.warn("[RESONANCE] Vérification match :", err);
        }
      }

      // Notification d'onde visuelle sur l'écran
      const pulseToast = document.createElement('div');
      pulseToast.className = 'fixed top-12 left-1/2 -translate-x-1/2 z-50 backdrop-blur-xl bg-blue-900/90 border border-[#4169E1] text-white px-5 py-3 rounded-2xl shadow-[0_0_30px_rgba(65,105,225,0.7)] flex items-center gap-3 animate-in fade-in zoom-in duration-200 pointer-events-none select-none';
      pulseToast.innerHTML = `
        <span class="w-3 h-3 rounded-full bg-[#4169E1] animate-ping shrink-0"></span>
        <div class="text-left">
          <p class="text-xs font-black text-blue-200">📡 Onde de Résonance transmise !</p>
          <p class="text-[11px] text-white/80">Vibration émise vers <strong>${creatorId || 'le créateur'}</strong></p>
        </div>
      `;
      document.body.appendChild(pulseToast);
      setTimeout(() => {
        pulseToast.style.opacity = '0';
        pulseToast.style.transition = 'opacity 0.4s ease';
        setTimeout(() => pulseToast.remove(), 400);
      }, 2400);

      if (isMatch) {
        // Synergy Match détecté ! Création dynamique du salon Daily.co
        const roomResult = await createSynergyMatchRoom(reelId, currentUserId, creatorId);
        onSynergyMatchTriggered(roomResult.url);
      } else {
        // Envoi de la notification FCM via l'API interne
        fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: creatorId,
            title: 'Onde de Résonance ! 📡',
            body: `${currentUserName} a fait résonner votre Reel.`,
            data: { type: 'RESONANCE', reelId }
          })
        }).catch((err) => console.warn('[FCM] Notification différée :', err));

        // SIMULATION DE SYNERGIE IMMÉDIATE (Pour le test et la démonstration demandée par l'utilisateur)
        // Permet de tester le salon Daily.co immédiatement sans attendre un deuxième utilisateur réel
        setTimeout(async () => {
          try {
            const roomResult = await createSynergyMatchRoom(reelId, currentUserId, creatorId);
            onSynergyMatchTriggered(roomResult.url);
          } catch (e) {
            console.warn('[Synergy Match Simulation Error]', e);
          }
        }, 1200);
      }
    } catch (error) {
      console.error('Erreur lors de la résonance :', error);
      // Rollback en cas d'erreur
      setHasResonated(false);
      setCount(prev => Math.max(0, prev - 1));
      try {
        localStorage.removeItem(`res_${reelId}_${currentUserId}`);
      } catch (_) {}
    } finally {
      setTimeout(() => setIsAnimating(false), 1000);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-0.5 select-none ${className}`}>
      <div className="relative">
        {/* Onde pulsante concentrique lors du clic */}
        {isAnimating && (
          <span className="absolute -inset-1.5 rounded-full bg-[#4169E1]/60 animate-ping pointer-events-none" />
        )}
        <button
          type="button"
          onClick={handleResonance}
          disabled={hasResonated}
          title={hasResonated ? 'Vous êtes en résonance 📡' : 'Faire résonner ce Reel 📡'}
          aria-label="Résonance"
          className={`relative w-8.5 h-8.5 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer ${
            hasResonated
              ? 'bg-[#4169E1]/80 backdrop-blur-md text-white shadow-[0_0_15px_rgba(65,105,225,0.7)] scale-105 border border-white/40'
              : 'backdrop-blur-md bg-white/10 text-white hover:bg-white/20 border border-white/20 active:scale-90'
          } ${isAnimating ? 'scale-110' : ''}`}
        >
          <Radio
            className={`w-4 h-4 transition-transform duration-300 ${
              hasResonated ? 'text-white rotate-12 scale-110 stroke-[2.5]' : 'text-white stroke-2'
            }`}
          />
        </button>
      </div>
      <span className="text-[9px] font-bold text-white drop-shadow-md leading-none">
        {count}
      </span>
    </div>
  );
};

export default ResonanceButton;
