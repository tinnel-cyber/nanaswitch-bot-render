import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface Interactive3dLoupeImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  maxScale?: number;
  maxRotate?: number;
  borderRadius?: string;
  children?: React.ReactNode;
}

export const Interactive3dLoupeImage: React.FC<Interactive3dLoupeImageProps> = ({
  src,
  alt,
  className = "w-full h-full object-cover",
  containerClassName = "",
  loading = "lazy",
  decoding = "async",
  maxScale = 1.42,
  maxRotate = 15,
  borderRadius = "0.75rem",
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isOverflowVisible, setIsOverflowVisible] = useState(false);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Détection de glissement tactile pour éviter d'ouvrir intempestivement le produit sur mobile
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasMovedSignificantly = useRef(false);

  // Valeurs de transformation 3D
  const [transformStyle, setTransformStyle] = useState<{
    rotateX: number;
    rotateY: number;
    rotateZ: number;
    scale: number;
    originX: number;
    originY: number;
    shadowX: number;
    shadowY: number;
  }>({
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    scale: 1,
    originX: 50,
    originY: 50,
    shadowX: 0,
    shadowY: 0
  });

  // Nettoyage complet au démontage
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const calculateTransform = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Coordonnées relatives dans le conteneur
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    // Normalisation de -1 à +1
    const normX = Math.max(-1, Math.min(1, (relX / rect.width) * 2 - 1));
    const normY = Math.max(-1, Math.min(1, (relY / rect.height) * 2 - 1));

    // Centre de transformation dynamique en pourcentage (point focal sous la loupe)
    const originX = Math.max(10, Math.min(90, Math.round((relX / rect.width) * 100)));
    const originY = Math.max(10, Math.min(90, Math.round((relY / rect.height) * 100)));

    // Rotations 3D dynamiques :
    // - Incliné vers le haut/bas : rotateX positif quand le curseur est en haut
    // - Incliné vers la gauche/droite : rotateY négatif quand le curseur est à droite
    // - Torsion dynamique d'angle rotateZ
    const rotateX = Math.round(-normY * maxRotate * 10) / 10;
    const rotateY = Math.round(normX * maxRotate * 10) / 10;
    const rotateZ = Math.round(-(normX * normY) * 4 * 10) / 10;

    // Ombres portées dynamiques opposées au curseur (effet de lévitation et profondeur)
    const shadowX = Math.round(-normX * 20);
    const shadowY = Math.round(18 - normY * 16);

    setTransformStyle({
      rotateX,
      rotateY,
      rotateZ,
      scale: maxScale,
      originX,
      originY,
      shadowX,
      shadowY
    });
  }, [maxRotate, maxScale]);

  const handlePointerStart = useCallback((clientX: number, clientY: number) => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setIsOverflowVisible(true);
    setIsActive(true);
    calculateTransform(clientX, clientY);
  }, [calculateTransform]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      calculateTransform(clientX, clientY);
    });
  }, [calculateTransform]);

  const handlePointerEnd = useCallback(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    setIsActive(false);

    // Réinitialise les rotations et l'échelle vers la position initiale avec retour élastique
    setTransformStyle(prev => ({
      ...prev,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
      originX: 50,
      originY: 50,
      shadowX: 0,
      shadowY: 0
    }));

    // Conserver overflow: visible et z-index: 50 pendant la durée du retour élastique (450ms)
    // pour que l'image ne soit jamais coupée net aux bords pendant son retour
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setIsOverflowVisible(false);
      resetTimerRef.current = null;
    }, 450);
  }, []);

  // Interception du clic si un glisser/toucher important a eu lieu sur mobile
  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasMovedSignificantly.current) {
      e.stopPropagation();
      hasMovedSignificantly.current = false;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${containerClassName}`}
      style={{
        overflow: isOverflowVisible ? 'visible' : 'hidden',
        zIndex: isOverflowVisible ? 50 : 1,
        perspective: '800px',
        borderRadius,
        touchAction: 'none'
      }}
      onClickCapture={handleClickCapture}
      onMouseEnter={(e) => handlePointerStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
      onMouseLeave={handlePointerEnd}
      onTouchStart={(e) => {
        if (e.touches.length > 0) {
          const t = e.touches[0];
          touchStartPos.current = { x: t.clientX, y: t.clientY };
          hasMovedSignificantly.current = false;
          handlePointerStart(t.clientX, t.clientY);
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length > 0) {
          const t = e.touches[0];
          if (touchStartPos.current) {
            const dist = Math.hypot(t.clientX - touchStartPos.current.x, t.clientY - touchStartPos.current.y);
            if (dist > 10) {
              hasMovedSignificantly.current = true;
            }
          }
          handlePointerMove(t.clientX, t.clientY);
        }
      }}
      onTouchEnd={() => {
        handlePointerEnd();
        setTimeout(() => {
          hasMovedSignificantly.current = false;
        }, 100);
      }}
      onTouchCancel={() => {
        handlePointerEnd();
        hasMovedSignificantly.current = false;
      }}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding={decoding}
        className={`${className} pointer-events-none select-none`}
        style={{
          borderRadius,
          transformOrigin: `${transformStyle.originX}% ${transformStyle.originY}%`,
          transform: `perspective(800px) rotateX(${transformStyle.rotateX}deg) rotateY(${transformStyle.rotateY}deg) rotateZ(${transformStyle.rotateZ}deg) scale(${transformStyle.scale})`,
          transition: isActive
            ? 'transform 0.08s ease-out, box-shadow 0.15s ease-out'
            : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.45s cubic-bezier(0.22, 1, 0.36, 1), filter 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: isActive
            ? `${transformStyle.shadowX}px ${transformStyle.shadowY}px 32px rgba(0, 0, 0, 0.48), 0 0 14px rgba(0, 0, 0, 0.22)`
            : 'none',
          filter: isActive
            ? `drop-shadow(${transformStyle.shadowX * 0.4}px ${transformStyle.shadowY * 0.4}px 18px rgba(0, 0, 0, 0.32))`
            : 'none',
          willChange: 'transform'
        }}
      />
      {children}
    </div>
  );
};

export default Interactive3dLoupeImage;
