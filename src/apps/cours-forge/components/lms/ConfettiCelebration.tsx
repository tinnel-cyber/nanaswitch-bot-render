import React, { useEffect, useRef, useCallback } from 'react';

interface ConfettiPiece {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  color: string;
  shape: 'rect' | 'circle' | 'star';
  opacity: number;
}

export interface ConfettiCelebrationProps {
  durationMs?: number;
  onComplete?: () => void;
  className?: string;
}

const COLORS = [
  '#f59e0b', // Amber Gold
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#ec4899', // Rose / Pink
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#fbbf24'  // Gold highlight
];

export const ConfettiCelebration: React.FC<ConfettiCelebrationProps> = ({
  durationMs = 4500,
  onComplete,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let startTime = performance.now();

    // Redimensionner le canvas au format de l'écran
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialiser 140 particules de confettis festives
    const pieces: ConfettiPiece[] = [];
    const count = Math.min(140, Math.floor(window.innerWidth / 8));

    for (let i = 0; i < count; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height * 0.4) - canvas.height * 0.2, // Démarre au sommet ou légèrement au-dessus
        w: Math.random() * 9 + 6,
        h: Math.random() * 12 + 8,
        vx: (Math.random() - 0.5) * 5,
        vy: Math.random() * 3 + 2.5,
        angle: Math.random() * 360,
        angularVelocity: (Math.random() - 0.5) * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: Math.random() > 0.3 ? 'rect' : Math.random() > 0.5 ? 'star' : 'circle',
        opacity: 1
      });
    }

    const render = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pieces.forEach((p) => {
        // Mise à jour de la physique
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.angularVelocity;
        p.vy += 0.04; // Gravité légère
        p.vx *= 0.99; // Résistance de l'air

        // Oscillation latérale
        p.x += Math.sin(p.y * 0.02) * 1.2;

        // Disparition progressive vers la fin
        if (progress > 0.7) {
          p.opacity = Math.max(0, 1 - (progress - 0.7) / 0.3);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Étoile à 4 branches
          ctx.beginPath();
          ctx.moveTo(0, -p.h / 2);
          ctx.lineTo(p.w / 4, -p.h / 6);
          ctx.lineTo(p.w / 2, 0);
          ctx.lineTo(p.w / 4, p.h / 6);
          ctx.lineTo(0, p.h / 2);
          ctx.lineTo(-p.w / 4, p.h / 6);
          ctx.lineTo(-p.w / 2, 0);
          ctx.lineTo(-p.w / 4, -p.h / 6);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        if (onComplete) onComplete();
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [durationMs, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-50 ${className}`}
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export default ConfettiCelebration;
