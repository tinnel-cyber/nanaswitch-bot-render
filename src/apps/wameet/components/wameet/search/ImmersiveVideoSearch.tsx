import React, { useState, useEffect } from 'react';
import { FloatingSearchBar } from './FloatingSearchBar';
import { ActiveSearchOverlay } from './ActiveSearchOverlay';
import { SearchResultsView } from './SearchResultsView';
import { CreatorProfileCard } from './CreatorProfileCard';
import {
  SearchTabType,
  SearchSortOption,
  CreatorProfile,
  ShortVideoResult,
  LongVideoResult,
  LiveSessionResult,
  SoundResult,
  HashtagResult,
  SearchDataCollection
} from './types';
import {
  MOCK_SEARCH_DATA,
  INITIAL_SEARCH_HISTORY
} from './mockSearchData';

export interface ImmersiveVideoSearchProps {
  /**
   * Notifie le conteneur parent (ex: WameetReelsView ou LiveRoomScreen)
   * pour figer légèrement ou assombrir la vidéo en arrière-plan.
   */
  onSearchStateChange?: (isOpen: boolean) => void;
  /**
   * Callback lors de la sélection d'une vidéo
   */
  onSelectVideo?: (video: ShortVideoResult | LongVideoResult | any) => void;
  /**
   * Callback lors de la sélection d'un Live
   */
  onSelectLive?: (live: LiveSessionResult) => void;
  /**
   * Callback lors du clic sur le chat avec un créateur depuis la fiche profil
   */
  onOpenChatWithCreator?: (creator: CreatorProfile) => void;
  /**
   * Données de recherche personnalisées optionnelles
   */
  customData?: Partial<SearchDataCollection>;
  /**
   * État d'ouverture contrôlé depuis un élément externe (ex: bouton Recherche de TopNavOverlay)
   */
  isOpen?: boolean;
  /**
   * Callback d'ouverture / fermeture
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Afficher la barre de recherche flottante sur la vidéo (défaut: true)
   */
  showFloatingBar?: boolean;
  /**
   * Classe CSS spécifique pour la barre flottante sur la vidéo
   */
  floatingBarClassName?: string;
  /**
   * Classe CSS globale
   */
  className?: string;
}

const STORAGE_KEY = 'wameet_video_search_history_v1';

/**
 * COMPOSANT MAÎTRE ImmersiveVideoSearch (Prompt 24 : Wameet Reels / Live)
 * Orchestre les 3 états :
 * 1. FloatingSearchBar : Fine barre translucide sur la vidéo (absolute top-4 left-4 right-4 z-40).
 * 2. ActiveSearchOverlay : Transition fluide d'expansion (scale-95 -> scale-100), affichage de l'historique
 *    avec icône d'horloge.
 * 3. SearchResultsView : Menu d'onglets défilants (Top, Utilisateurs, Shorts, Longues, Lives, Sons, Hashtags)
 *    avec filtre rapide "Trier par" (Les plus vues, Nouveautés).
 * 4. CreatorProfileCard : Ouvre la carte du profil avec stats et playlist en grille au clic sur un créateur ou Live.
 */
export const ImmersiveVideoSearch: React.FC<ImmersiveVideoSearchProps> = ({
  isOpen: controlledIsOpen,
  onOpenChange,
  showFloatingBar = true,
  onSearchStateChange,
  onSelectVideo,
  onSelectLive,
  onOpenChatWithCreator,
  customData,
  floatingBarClassName = '',
  className = ''
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSubmittedSearch, setHasSubmittedSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTabType>('top');
  const [sortBy, setSortBy] = useState<SearchSortOption>('most_viewed');
  const [selectedCreator, setSelectedCreator] = useState<CreatorProfile | null>(null);


  // Historique persistant avec repli gracieux
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return INITIAL_SEARCH_HISTORY;
  });

  // Sauvegarde automatique de l'historique
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(searchHistory));
      } catch {}
    }
  }, [searchHistory]);

  // Données combinées avec les mocks de référence
  const searchData: SearchDataCollection = {
    ...MOCK_SEARCH_DATA,
    ...customData
  };

  /**
   * Ouvre la recherche et informe le lecteur vidéo pour assombrir / figer
   */
  const handleOpenSearch = () => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(true);
    }
    onOpenChange?.(true);
    if (onSearchStateChange) {
      onSearchStateChange(true);
    }
  };

  /**
   * Ferme la recherche et restaure la vidéo
   */
  const handleCloseSearch = () => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(false);
    }
    onOpenChange?.(false);
    setHasSubmittedSearch(false);
    setSelectedCreator(null);
    if (onSearchStateChange) {
      onSearchStateChange(false);
    }
  };

  /**
   * Lancement d'une recherche (enregistre dans l'historique et passe à l'État 3)
   */
  const handleSearchSubmit = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearchQuery(trimmed);
    setHasSubmittedSearch(true);

    // Ajout en tête d'historique (sans doublon)
    setSearchHistory((prev) => [
      trimmed,
      ...prev.filter((p) => p.toLowerCase() !== trimmed.toLowerCase())
    ].slice(0, 10));
  };

  /**
   * Suppression d'un élément d'historique individuel
   */
  const handleRemoveHistoryItem = (phrase: string) => {
    setSearchHistory((prev) => prev.filter((p) => p !== phrase));
  };

  /**
   * Vidage complet de l'historique
   */
  const handleClearHistory = () => {
    setSearchHistory([]);
  };

  /**
   * Clic sur un créateur ou un Live -> Ouvre CreatorProfileCard
   */
  const handleSelectCreator = (creator: CreatorProfile) => {
    setSelectedCreator(creator);
  };

  return (
    <div className={`contents ${className}`}>
      {/* =======================================================================
          ÉTAT 1 : BARRE FLOTTANTE SUR LA VIDÉO (Z-40)
         ======================================================================= */}
      {showFloatingBar && !isOpen && (
        <FloatingSearchBar
          onClick={handleOpenSearch}
          placeholder="Rechercher sur Wameet..."
          trendingTeaser="Chaussures Ouaga, Lives..."
          className={floatingBarClassName}
        />
      )}

      {/* =======================================================================
          ÉTAT 2 & 3 : ACTIVE SEARCH OVERLAY (EXPANSION FRAMER MOTION / TAILWIND)
         ======================================================================= */}
      <ActiveSearchOverlay
        isOpen={isOpen}
        onClose={handleCloseSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        searchHistory={searchHistory}
        onRemoveHistoryItem={handleRemoveHistoryItem}
        onClearHistory={handleClearHistory}
        hasSubmittedSearch={hasSubmittedSearch}
      >
        {/* ÉTAT 3 : RÉSULTATS DE RECHERCHE COMPLETS */}
        <SearchResultsView
          query={searchQuery}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          sortBy={sortBy}
          onSortChange={setSortBy}
          data={searchData}
          onSelectCreator={handleSelectCreator}
          onSelectVideo={onSelectVideo}
          onSelectLive={(live) => {
            const matchedCreator = searchData.creators.find(
              (c) => c.handle === live.creatorHandle
            );
            if (matchedCreator) {
              setSelectedCreator(matchedCreator);
            } else if (onSelectLive) {
              onSelectLive(live);
            }
          }}
          onSelectSound={(sound) => {
            handleSearchSubmit(sound.title);
          }}
          onSelectHashtag={(hashtag) => {
            handleSearchSubmit(hashtag.tag);
          }}
        />
      </ActiveSearchOverlay>

      {/* =======================================================================
          COMPOSANT RÉSULTAT : CARTE DE PROFIL DU CRÉATEUR AVEC STATS ET PLAYLISTE
         ======================================================================= */}
      {selectedCreator && (
        <CreatorProfileCard
          creator={selectedCreator}
          onClose={() => setSelectedCreator(null)}
          onSelectPlaylistItem={(item) => {
            if (onSelectVideo) onSelectVideo(item);
          }}
          onOpenChat={(creator) => {
            if (onOpenChatWithCreator) onOpenChatWithCreator(creator);
          }}
        />
      )}
    </div>
  );
};

export default ImmersiveVideoSearch;
