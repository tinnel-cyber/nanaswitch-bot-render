import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  X, 
  Move,
  Maximize2
} from 'lucide-react';
import { playTapBeep } from '../../utils/audio';

export interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageAlt?: string;
  title?: string;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageAlt = 'Image',
  title = 'Visualiseur d\'Image',
}) => {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  // Réinitialisation des transformations à l'ouverture ou changement d'image
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, imageUrl]);

  // Fermeture sur Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Commandes de Zoom
  const handleZoomIn = useCallback(() => {
    playTapBeep();
    setScale((prev) => Math.min(5, +(prev + 0.3).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    playTapBeep();
    setScale((prev) => {
      const next = Math.max(0.4, +(prev - 0.3).toFixed(2));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Zoom dynamique à la molette de souris
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = -e.deltaY * 0.002;
    setScale((prev) => {
      const next = Math.min(5, Math.max(0.4, +(prev + delta).toFixed(2)));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  // Rotation 90°
  const handleRotateCw = useCallback(() => {
    playTapBeep();
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleRotateCcw = useCallback(() => {
    playTapBeep();
    setRotation((prev) => (prev - 90 + 360) % 360);
  }, []);

  // Double-clic : réinitialiser ou basculer zoom x2
  const handleDoubleClick = useCallback(() => {
    playTapBeep();
    if (scale > 1.2 || rotation !== 0 || pan.x !== 0 || pan.y !== 0) {
      setScale(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  }, [scale, rotation, pan]);

  // Réinitialisation complète
  const handleReset = useCallback(() => {
    playTapBeep();
    setScale(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, []);

  // Gestion du Pan / Dragging tactile & souris
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;
    setPan({
      x: dragStartRef.current.origX + deltaX,
      y: dragStartRef.current.origY + deltaY,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Barre supérieure : Titre et bouton Fermer */}
      <div 
        className="w-full max-w-4xl flex items-center justify-between z-10 px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Move className="w-4 h-4 text-blue-400 shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold truncate text-slate-200">
            {title}
          </h3>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
            {Math.round(scale * 100)}% • {rotation}°
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onClose();
          }}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition cursor-pointer"
          title="Fermer (Échap)"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Zone centrale de zoom / pan interactive */}
      <div
        className="flex-1 w-full max-w-5xl flex items-center justify-center overflow-hidden my-2 relative touch-none cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            transformOrigin: 'center center',
          }}
          className="flex items-center justify-center pointer-events-none select-none max-w-full max-h-full"
        >
          <img
            src={imageUrl}
            alt={imageAlt}
            draggable={false}
            className="max-h-[75vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl border border-slate-800 select-none"
          />
        </div>
      </div>

      {/* Barre inférieure de contrôles visuels (Zoom In/Out, Rotation, Reset) */}
      <div 
        className="z-10 flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={scale <= 0.4}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition cursor-pointer"
          title="Zoom arrière (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Niveau de zoom actuel */}
        <span className="text-xs font-mono font-bold text-blue-400 px-2 min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>

        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={scale >= 5}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition cursor-pointer"
          title="Zoom avant (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-6 bg-slate-700 mx-1" />

        {/* Rotation Anti-horaire */}
        <button
          type="button"
          onClick={handleRotateCcw}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
          title="Pivoter 90° vers la gauche (Anti-horaire)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Rotation Horaire */}
        <button
          type="button"
          onClick={handleRotateCw}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
          title="Pivoter 90° vers la droite (Horaire)"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-6 bg-slate-700 mx-1" />

        {/* Réinitialiser */}
        <button
          type="button"
          onClick={handleReset}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          title="Réinitialiser la vue (Double-clic)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">100%</span>
        </button>
      </div>
    </div>
  );
};

export default ImageLightboxModal;
