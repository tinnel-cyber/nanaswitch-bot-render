import React, { useMemo } from 'react';

export interface WaterDropletItem {
  id: number;
  left: number; // 0 à 100%
  width: number; // 1.5px à 3.5px
  height: number; // 3px à 8px (forme allongée de goutte)
  duration: number; // 4.5s à 9s (chute douce)
  delay: number; // Délai négatif pour animation immédiate et fluide
  opacity: number; // 0.25 à 0.65 (translucide naturelle)
  driftX: number; // Dérive subtile horizontale (-10px à +10px)
}

/**
 * Composant WaterDroplets
 * Génère des minuscules gouttelettes d'eau blanches tombant doucement du ciel en arrière-plan.
 * Animation 100% CSS matérielle ultra-performante (z-0, pointer-events-none).
 */
export const WaterDroplets: React.FC<{ count?: number; className?: string }> = ({
  count = 55,
  className = '',
}) => {
  // Génération déterministe pour éviter tout recalcul ou décalage de rendu
  const droplets = useMemo<WaterDropletItem[]>(() => {
    return Array.from({ length: count }, (_, i) => {
      const seed1 = ((i * 9301 + 49297) % 233280) / 233280;
      const seed2 = ((i * 49297 + 9301) % 233280) / 233280;
      const seed3 = ((i * 12345 + 67891) % 233280) / 233280;
      const seed4 = ((i * 31415 + 92653) % 233280) / 233280;

      const left = Math.round(seed1 * 995) / 10; // 0.0% à 99.5%
      const width = 1.5 + Math.round(seed2 * 2.2 * 10) / 10; // 1.5px à 3.7px (très petites)
      // Forme de larme/goutte d'eau naturelle : hauteur plus grande que la largeur
      const height = Math.round((width * (1.8 + seed3 * 1.4)) * 10) / 10; // ~3px à 8px
      const duration = 4.5 + Math.round(seed4 * 4.5 * 10) / 10; // 4.5s à 9.0s (douceur)
      const delay = -Math.round(seed2 * duration * 10) / 10; // Délais négatifs : l'écran est déjà rempli
      const opacity = Math.round((0.25 + seed3 * 0.45) * 100) / 100; // 0.25 à 0.70
      const driftX = Math.round((-10 + seed1 * 20) * 10) / 10; // -10px à +10px

      return {
        id: i,
        left,
        width,
        height,
        duration,
        delay,
        opacity,
        driftX,
      };
    });
  }, [count]);

  return (
    <div
      className={`absolute inset-0 z-0 pointer-events-none overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      <style>{`
        @keyframes waterDropletFall {
          0% {
            transform: translate3d(0, -30px, 0);
            opacity: 0;
          }
          12% {
            opacity: var(--drop-opacity, 0.45);
          }
          88% {
            opacity: var(--drop-opacity, 0.45);
          }
          100% {
            transform: translate3d(var(--drift-x, 0px), calc(100vh + 40px), 0);
            opacity: 0;
          }
        }
      `}</style>

      {droplets.map((drop) => (
        <span
          key={drop.id}
          className="absolute rounded-full bg-gradient-to-b from-white/95 via-white/50 to-white/20"
          style={{
            left: `${drop.left}%`,
            top: 0,
            width: `${drop.width}px`,
            height: `${drop.height}px`,
            boxShadow: '0 0 2.5px rgba(255, 255, 255, 0.75)',
            animation: `waterDropletFall ${drop.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite`,
            animationDelay: `${drop.delay}s`,
            ['--drop-opacity' as any]: drop.opacity,
            ['--drift-x' as any]: `${drop.driftX}px`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
};

export default WaterDroplets;
