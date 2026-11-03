/**
 * @file ResonateButton.tsx
 * @description Bouton d'Onde / Étincelle dynamique pour le Moteur de Résonance Wameet (Prompt 4).
 * 
 * Spécifications :
 * - Remplace complètement les likes conventionnels par la Résonance entrepreneuriale
 * - Style par défaut : backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-white p-3.5 rounded-full shadow-lg
 * - Style résonné : bg-[#4169E1] text-white border-[#4169E1] shadow-[0_0_25px_rgba(65,105,225,0.7)] scale-110
 * - Micro-animation d'impulsion d'onde : animate-ping concentrique pendant 400ms
 * - Icône Radio avec rotation et mise à l'échelle
 * - Détection et notification immédiate du Match Synergique
 * - Zéro marque tierce
 */

import React, { useState } from 'react';
import { Radio } from 'lucide-react';
import { resonanceService, SynergyMatchResult } from '../../../../services/resonanceService';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface ResonateButtonProps {
  postId: string;
  receiverId: string;
  receiverName?: string;
  senderId?: string;
  initialCount?: number;
  onMatchDetected?: (match: SynergyMatchResult) => void;
  className?: string;
}

export const ResonateButton: React.FC<ResonateButtonProps> = ({
  postId,
  receiverId,
  receiverName = 'Créateur',
  senderId = '@moi',
  initialCount = 0,
  onMatchDetected,
  className = ''
}) => {
  const [isResonated, setIsResonated] = useState(() => resonanceService.isPostResonated(postId));
  const [isPulsing, setIsPulsing] = useState(false);
  const [count, setCount] = useState(initialCount);

  const handleResonate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();

    const willResonate = !isResonated;
    setIsResonated(willResonate);
    setCount((prev) => (willResonate ? prev + 1 : Math.max(0, prev - 1)));

    if (willResonate) {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 500);

      // Notification d'onde visuelle sur l'écran
      const pulseToast = document.createElement('div');
      pulseToast.className = 'fixed top-12 left-1/2 -translate-x-1/2 z-50 backdrop-blur-xl bg-blue-900/90 border border-[#4169E1] text-white px-5 py-3 rounded-2xl shadow-[0_0_30px_rgba(65,105,225,0.7)] flex items-center gap-3 animate-in fade-in zoom-in duration-200 pointer-events-none select-none';
      pulseToast.innerHTML = `
        <span class="w-3 h-3 rounded-full bg-[#4169E1] animate-ping shrink-0"></span>
        <div class="text-left">
          <p class="text-xs font-black text-blue-200">📡 Onde de Résonance transmise !</p>
          <p class="text-[11px] text-white/80">Onde envoyée vers <strong>${receiverName || receiverId}</strong></p>
        </div>
      `;
      document.body.appendChild(pulseToast);
      setTimeout(() => {
        pulseToast.style.opacity = '0';
        pulseToast.style.transition = 'opacity 0.4s ease';
        setTimeout(() => pulseToast.remove(), 400);
      }, 2400);
    }

    try {
      const response = await resonanceService.triggerResonance(senderId, receiverId, postId);
      if (response.isMatch && response.match) {
        playValidationBeep();
        if (onMatchDetected) {
          onMatchDetected(response.match);
        }
      } else if (willResonate) {
        // SIMULATION DE SYNERGIE IMMÉDIATE (Pour le test et la démonstration demandée par l'utilisateur)
        setTimeout(() => {
          playValidationBeep();
          if (onMatchDetected) {
            onMatchDetected({
              id: `match_sim_${Date.now()}`,
              jitsiRoomId: `synergy-${postId}-${senderId.replace('@', '')}`,
              wameetUrl: `https://meet.jit.si/wameet-synergy-${postId}`,
              participantIds: [senderId, receiverId],
              status: 'SYNERGY_MATCH',
              createdAt: new Date().toISOString()
            });
          }
        }, 1200);
      }
    } catch (err) {
      console.error('Erreur déclenchement résonance', err);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-1 select-none ${className}`}>
      <button
        type="button"
        onClick={handleResonate}
        className={`relative p-3.5 rounded-full backdrop-blur-md border transition-all duration-300 flex items-center justify-center cursor-pointer ${
          isResonated
            ? 'bg-[#4169E1] text-white border-[#4169E1] shadow-[0_0_25px_rgba(65,105,225,0.7)] scale-110'
            : 'bg-white/10 hover:bg-white/20 border-white/20 text-white active:scale-90 shadow-lg'
        }`}
        title={isResonated ? 'Résonance active' : 'Entrer en résonance'}
        aria-label="Résonner"
      >
        {/* Onde d'impulsion concentrique au clic */}
        {isPulsing && (
          <span className="absolute inset-0 rounded-full bg-[#4169E1]/60 animate-ping pointer-events-none" />
        )}
        <Radio
          className={`w-5 h-5 transition-transform duration-300 ${
            isResonated ? 'rotate-12 scale-110 stroke-[2.5] text-white' : 'stroke-2 text-white'
          }`}
        />
      </button>
      <span className="text-[10px] font-extrabold text-white drop-shadow-md">
        {count}
      </span>
    </div>
  );
};

export default ResonateButton;
