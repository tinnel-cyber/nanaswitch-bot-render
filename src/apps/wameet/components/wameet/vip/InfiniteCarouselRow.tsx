import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Crown, Sparkles } from 'lucide-react';
import { InfiniteCarouselRowProps } from './types';
import { playTapBeep } from '../../../../../utils/audio';

/**
 * Composant Carrousel Infini Flottant (InfiniteCarouselRow)
 * Fait défiler horizontalement les espaces VIP avec boucle continue,
 * pause au survol, flèches de navigation manuelles et support tactile/drag.
 */
export function InfiniteCarouselRow<T>({
  items,
  renderItem,
  title,
  subtitle,
  badge,
  badgeTone = 'gold',
  icon,
  speed = 'normal',
  direction = 'left',
  pauseOnHover = true,
  showNavigationControls = true,
  actionButton,
  className = '',
  countLabel
}: InfiniteCarouselRowProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Vitesse d'animation CSS
  const getSpeedClass = () => {
    if (direction === 'right') {
      return 'animate-infinite-carousel-reverse';
    }
    switch (speed) {
      case 'slow':
        return 'animate-infinite-carousel-slow';
      case 'fast':
        return 'animate-infinite-carousel-fast';
      case 'normal':
      default:
        return 'animate-infinite-carousel';
    }
  };

  // Défilement manuel fluide
  const scroll = (offset: number) => {
    playTapBeep();
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: offset,
        behavior: 'smooth'
      });
    }
  };

  // Badge Tone Styles
  const getBadgeStyle = () => {
    switch (badgeTone) {
      case 'silver':
        return 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200';
      case 'emerald':
        return 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300';
      case 'blue':
        return 'bg-blue-500/15 border-blue-400/40 text-blue-300';
      case 'gold':
      default:
        return 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-400/50 text-amber-300';
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [items]);

  // Si pas d'éléments, rien à afficher
  if (!items || items.length === 0) {
    return null;
  }

  // Doublement de la liste pour l'effet de boucle infinie transparente
  const duplicatedItems = [...items, ...items];

  return (
    <section
      aria-label={title || 'Carrousel VIP'}
      className={`relative w-full py-3 my-2 select-none overflow-hidden ${className}`}
    >
      {/* Entête de Section */}
      {(title || subtitle || badge || actionButton) && (
        <div className="px-4 sm:px-6 mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1 max-w-2xl">
            {badge && (
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-xs ${getBadgeStyle()}`}
                >
                  {icon || <Crown className="w-3.5 h-3.5" />}
                  <span>{badge}</span>
                </span>
                {countLabel && (
                  <span className="text-[11px] font-bold text-slate-400">
                    {countLabel}
                  </span>
                )}
              </div>
            )}

            {title && (
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>{title}</span>
              </h2>
            )}

            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                {subtitle}
              </p>
            )}
          </div>

          {/* Contrôles de navigation & Bouton d'action */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            {actionButton && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  actionButton.onClick?.();
                }}
                className="px-3.5 py-1.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <span>{actionButton.label}</span>
              </button>
            )}

            {showNavigationControls && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scroll(-360)}
                  disabled={!canScrollLeft}
                  aria-label="Faire défiler vers la gauche"
                  className={`w-9 h-9 rounded-2xl border flex items-center justify-center transition-all cursor-pointer ${
                    canScrollLeft
                      ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 shadow-md active:scale-90 hover:border-slate-500'
                      : 'bg-slate-950/40 text-slate-600 border-slate-850 cursor-not-allowed opacity-50'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => scroll(360)}
                  disabled={!canScrollRight}
                  aria-label="Faire défiler vers la droite"
                  className={`w-9 h-9 rounded-2xl border flex items-center justify-center transition-all cursor-pointer ${
                    canScrollRight
                      ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 shadow-md active:scale-90 hover:border-slate-500'
                      : 'bg-slate-950/40 text-slate-600 border-slate-850 cursor-not-allowed opacity-50'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Piste de Carrousel avec gradients d'estompage latéraux */}
      <div className="relative w-full group">
        {/* Dégradés d'estompage bords gauche & droit */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent z-20" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-slate-950 via-slate-950/70 to-transparent z-20" />

        {/* Conteneur de Défilement Défilant / Glissant */}
        <div
          ref={scrollContainerRef}
          onMouseEnter={() => pauseOnHover && setIsPaused(true)}
          onMouseLeave={() => pauseOnHover && setIsPaused(false)}
          className="w-full overflow-x-auto scrollbar-none py-4 px-4 sm:px-6 scroll-smooth cursor-grab active:cursor-grabbing"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <div
            className={`flex items-stretch gap-4 sm:gap-6 ${
              !isPaused ? getSpeedClass() : 'flex'
            }`}
            style={{
              animationPlayState: isPaused ? 'paused' : 'running'
            }}
          >
            {duplicatedItems.map((item, index) => (
              <div
                key={`carousel-item-${index}`}
                className="shrink-0 flex items-stretch"
              >
                {renderItem(item, index % items.length)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default InfiniteCarouselRow;
