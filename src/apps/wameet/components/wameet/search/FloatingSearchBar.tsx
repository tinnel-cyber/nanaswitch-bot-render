import React from 'react';
import { Search, Sparkles } from 'lucide-react';
import { playTapBeep } from '../../../../../utils/audio';

export interface FloatingSearchBarProps {
  /**
   * Déclenché lors du clic sur la barre pour ouvrir l'ActiveSearchOverlay
   */
  onClick: () => void;
  /**
   * Texte indicatif du champ
   */
  placeholder?: string;
  /**
   * Suggère une phrase tendance en direct (ex: "Chaussures Ouaga")
   */
  trendingTeaser?: string;
  /**
   * Classe CSS additionnelle (permet d'ajuster ou surcharger le positionnement)
   */
  className?: string;
}

/**
 * COMPOSANT FloatingSearchBar (État 1 - Sur la vidéo)
 * Directives UI/UX au millimètre :
 * - Une barre de recherche fine, élégante et translucide située en haut de l'écran vidéo (absolute top-4 left-4 right-4 z-40).
 * - Design : Fond en verre très léger (bg-white/10 backdrop-blur-sm border border-white/20 text-white),
 *   avec une icône de loupe subtile.
 * - Mobile First & Z-Index optimisé pour ne jamais bloquer le swipe vertical des vidéos.
 */
export const FloatingSearchBar: React.FC<FloatingSearchBarProps> = ({
  onClick,
  placeholder = 'Rechercher sur Wameet...',
  trendingTeaser = 'Chaussures Ouaga, Lives...',
  className = ''
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      playTapBeep();
    } catch {}
    onClick();
  };

  return (
    <div
      className={`absolute top-4 left-4 right-4 z-40 pointer-events-auto select-none ${className}`}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label="Ouvrir la recherche Wameet"
        className="w-full h-10 sm:h-11 px-3.5 sm:px-4 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 backdrop-blur-sm border border-white/20 text-white flex items-center justify-between gap-2.5 shadow-lg shadow-black/20 transition-all duration-200 group cursor-pointer"
      >
        {/* Loupe subtile + Placeholder */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Search className="w-4 h-4 text-white/70 group-hover:text-white transition-colors shrink-0 stroke-[2.2]" />
          <span className="text-xs sm:text-sm font-medium text-white/75 group-hover:text-white transition-colors truncate">
            {placeholder}
          </span>
        </div>

        {/* Badge discret tendance / Micro-teaser */}
        {trendingTeaser && (
          <div className="hidden xs:flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-white/80 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
            <span className="truncate max-w-[110px] sm:max-w-[150px]">{trendingTeaser}</span>
          </div>
        )}
      </button>
    </div>
  );
};

export default FloatingSearchBar;
