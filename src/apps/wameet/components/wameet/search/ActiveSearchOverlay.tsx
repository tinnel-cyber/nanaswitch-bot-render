import React, { useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  Clock,
  TrendingUp,
  Sparkles,
  Flame,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface ActiveSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  searchHistory: string[];
  onRemoveHistoryItem: (phrase: string) => void;
  onClearHistory: () => void;
  trendingSuggestions?: string[];
  hasSubmittedSearch: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * COMPOSANT ActiveSearchOverlay (État 2 & Conteneur de Transition)
 * Directives UI/UX au millimètre :
 * - Transition fluide d'expansion : scale-95 vers scale-100, opacity-0 vers 100 via Framer Motion / Motion.
 * - État 2 (Avant d'écrire) : Liste simple avec icône d'horloge affichant l'historique des phrases déjà tapées
 *   (ex: "Chaussures Ouaga", "Concert Live"). Au clic sur une phrase, lance la recherche.
 * - Navigation fluide vers l'État 3 (SearchResultsView).
 */
export const ActiveSearchOverlay: React.FC<ActiveSearchOverlayProps> = ({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  searchHistory,
  onRemoveHistoryItem,
  onClearHistory,
  trendingSuggestions = [
    'Chaussures Ouaga',
    'Concert Live',
    'Vente Flash Nanasore',
    'Idées Business 18h',
    'Sons Viraux Abidjan'
  ],
  hasSubmittedSearch,
  children,
  className = ''
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus sur le champ dès l'ouverture
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      playValidationBeep();
    } catch {}
    onSearchSubmit(searchQuery.trim());
  };

  const handleHistoryClick = (phrase: string) => {
    try {
      playTapBeep();
    } catch {}
    setSearchQuery(phrase);
    onSearchSubmit(phrase);
  };

  const handleClearInput = () => {
    try {
      playTapBeep();
    } catch {}
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleClose = () => {
    try {
      playTapBeep();
    } catch {}
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="active-search-overlay"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col text-white overflow-hidden select-none ${className}`}
        >
          {/* ===================================================================
              1. BARRE DE RECHERCHE SUPÉRIEURE ACTIVE
             =================================================================== */}
          <div className="px-3 sm:px-4 pt-3 pb-2.5 border-b border-white/10 flex items-center gap-2">
            {/* Bouton Retour ← */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fermer la recherche"
              className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Formulaire de recherche avec input */}
            <form onSubmit={handleSubmit} className="flex-1 relative flex items-center">
              <div className="absolute left-3.5 text-white/50 pointer-events-none">
                <Search className="w-4 h-4 stroke-[2.4]" />
              </div>

              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher des vidéos, créateurs, lives..."
                className="w-full h-10 sm:h-11 pl-10 pr-9 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/45 text-xs sm:text-sm font-medium focus:bg-white/15 focus:border-blue-400 focus:outline-none transition-all shadow-inner"
              />

              {/* Bouton effacer le texte (✕) */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearInput}
                  className="absolute right-3 p-1 rounded-full text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Bouton Rechercher */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!searchQuery.trim()}
              className="px-3.5 sm:px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs sm:text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            >
              Chercher
            </button>
          </div>

          {/* ===================================================================
              2. CORPS : ÉTAT 2 (AVANT D'ÉCRIRE) OU ÉTAT 3 (RÉSULTATS)
             =================================================================== */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {hasSubmittedSearch ? (
              // Rendu de l'État 3 (SearchResultsView passé via children)
              children
            ) : (
              // ÉTAT 2 : AVANT D'ÉCRIRE -> HISTORIQUE AVEC ICÔNE D'HORLOGE
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* SECTION HISTORIQUE DE RECHERCHE */}
                {searchHistory.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider px-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>Recherches récentes</span>
                      </span>

                      <button
                        type="button"
                        onClick={onClearHistory}
                        className="text-[11px] font-bold text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Tout effacer</span>
                      </button>
                    </div>

                    {/* Liste d'historique avec icône d'horloge */}
                    <div className="space-y-1">
                      {searchHistory.map((phrase) => (
                        <div
                          key={phrase}
                          className="group flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-white/10 active:bg-white/15 transition-all cursor-pointer"
                          onClick={() => handleHistoryClick(phrase)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Icône d'horloge exigée au millimètre */}
                            <Clock className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors shrink-0 stroke-[2]" />
                            <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                              {phrase}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveHistoryItem(phrase);
                            }}
                            className="p-1 rounded-full text-slate-500 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="Supprimer de l'historique"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SECTION TENDANCES & SUGGESTIONS POPULAIRES */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wider px-1">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Tendances Wameet Live</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {trendingSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleHistoryClick(suggestion)}
                        className="px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-amber-400/40 text-xs font-semibold text-slate-200 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ActiveSearchOverlay;
