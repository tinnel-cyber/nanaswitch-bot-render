import React, { useState, useEffect } from 'react';

export interface SlideItem {
  id: string;
  imageUrl: string;
  captionTitle?: string;
  captionText?: string;
}

export interface SlideSettings {
  autoplay?: boolean;
  interval?: number; // en millisecondes
  aspectRatio?: 'video' | 'square' | 'wide';
}

export interface SlideModuleProps {
  id: string;
  settings?: SlideSettings;
  slides: SlideItem[];
  isEditing?: boolean; // Mode édition en direct dans le Block Builder
  onUpdate?: (updatedSlides: SlideItem[]) => void;
}

export const SlideModuleBlock: React.FC<SlideModuleProps> = ({
  id: _id,
  settings = { autoplay: true, interval: 4000, aspectRatio: 'wide' },
  slides = [],
  isEditing = false,
  onUpdate,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Gestion du défilement automatique
  useEffect(() => {
    if (!settings.autoplay || isEditing || slides.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, settings.interval || 4000);

    return () => clearInterval(timer);
  }, [settings.autoplay, settings.interval, isEditing, slides.length]);

  if (!slides || slides.length === 0) {
    return (
      <div className="p-8 border-2 border-dashed border-gray-600 rounded-xl text-center text-gray-400">
        Aucune image configurée pour ce Slide Module.
      </div>
    );
  }

  const nextSlide = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Ratio d'affichage
  const aspectClass = 
    settings.aspectRatio === 'square' ? 'aspect-square' :
    settings.aspectRatio === 'video' ? 'aspect-video' : 'aspect-[21/9]';

  return (
    <div className="relative group w-full overflow-hidden rounded-2xl bg-slate-900 shadow-lg border border-slate-800">
      {/* Conteneur du Slide */}
      <div className={`relative w-full ${aspectClass} overflow-hidden`}>
        {slides.map((slide, index) => (
          <div
            key={slide.id || index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <img
              src={slide.imageUrl || 'https://via.placeholder.com/800x400'}
              alt={slide.captionTitle || `Slide ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Dégradé et légende */}
            {(slide.captionTitle || slide.captionText) && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 sm:p-6 text-white pointer-events-none">
                {slide.captionTitle && (
                  <h3 className="text-base sm:text-lg md:text-xl font-bold tracking-tight mb-1">{slide.captionTitle}</h3>
                )}
                {slide.captionText && (
                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">{slide.captionText}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Flèches de navigation */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full opacity-80 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm shadow-md cursor-pointer"
            aria-label="Slide précédente"
          >
            ❮
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full opacity-80 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm shadow-md cursor-pointer"
            aria-label="Slide suivante"
          >
            ❯
          </button>
        </>
      )}

      {/* Indicateurs (Puces) */}
      <div className="absolute bottom-3 right-4 z-20 flex space-x-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setCurrentIndex(index);
            }}
            className={`h-2 rounded-full transition-all cursor-pointer ${
              index === currentIndex ? 'bg-orange-500 w-5' : 'bg-white/50 w-2'
            }`}
            aria-label={`Aller au slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Mode édition en direct (Panneau rapide si isEditing est actif) */}
      {isEditing && (
        <div className="absolute top-3 left-3 z-30 bg-blue-600/90 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg shadow-md font-medium">
          Mode Édition Directe (Slide {currentIndex + 1}/{slides.length})
        </div>
      )}
    </div>
  );
};

export default SlideModuleBlock;
