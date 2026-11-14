import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  Flame,
  ArrowUpDown,
  Play,
  Users,
  Video,
  Film,
  Radio,
  Music,
  Hash,
  Sparkles,
  ShoppingBag,
  Clock,
  Eye,
  Heart,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
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
import { playTapBeep } from '../../../../../utils/audio';

export interface SearchResultsViewProps {
  query: string;
  activeTab: SearchTabType;
  onTabChange: (tab: SearchTabType) => void;
  sortBy: SearchSortOption;
  onSortChange: (sort: SearchSortOption) => void;
  data: SearchDataCollection;
  onSelectCreator: (creator: CreatorProfile) => void;
  onSelectVideo?: (video: any) => void;
  onSelectLive?: (live: LiveSessionResult) => void;
  onSelectSound?: (sound: SoundResult) => void;
  onSelectHashtag?: (hashtag: HashtagResult) => void;
  className?: string;
}

const TABS: Array<{ id: SearchTabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'top', label: 'Top', icon: Sparkles },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'shorts', label: 'Vidéos Shorts', icon: Film },
  { id: 'longs', label: 'Vidéos Longues', icon: Video },
  { id: 'lives', label: 'Lives en cours', icon: Radio },
  { id: 'sounds', label: 'Sons', icon: Music },
  { id: 'hashtags', label: 'Hashtags', icon: Hash }
];

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  query,
  activeTab,
  onTabChange,
  sortBy,
  onSortChange,
  data,
  onSelectCreator,
  onSelectVideo,
  onSelectLive,
  onSelectSound,
  onSelectHashtag,
  className = ''
}) => {
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const cleanQuery = query.toLowerCase().trim();

  // 1. Filtrage et Tri des Créateurs
  const filteredCreators = useMemo(() => {
    let list = data.creators.filter(
      (c) =>
        !cleanQuery ||
        c.name.toLowerCase().includes(cleanQuery) ||
        c.handle.toLowerCase().includes(cleanQuery) ||
        c.category.toLowerCase().includes(cleanQuery)
    );
    return list.sort((a, b) => {
      if (sortBy === 'newest') return (b.salesCount || 0) - (a.salesCount || 0);
      return b.followersCount - a.followersCount;
    });
  }, [data.creators, cleanQuery, sortBy]);

  // 2. Filtrage et Tri des Shorts
  const filteredShorts = useMemo(() => {
    let list = data.shorts.filter(
      (s) =>
        !cleanQuery ||
        s.title.toLowerCase().includes(cleanQuery) ||
        s.creatorName.toLowerCase().includes(cleanQuery) ||
        s.hashtags.some((h) => h.toLowerCase().includes(cleanQuery))
    );
    return list.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAtTimestamp - a.createdAtTimestamp;
      return b.viewsCount - a.viewsCount;
    });
  }, [data.shorts, cleanQuery, sortBy]);

  // 3. Filtrage et Tri des Vidéos Longues
  const filteredLongs = useMemo(() => {
    let list = data.longs.filter(
      (l) =>
        !cleanQuery ||
        l.title.toLowerCase().includes(cleanQuery) ||
        l.creatorName.toLowerCase().includes(cleanQuery) ||
        l.category.toLowerCase().includes(cleanQuery)
    );
    return list.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAtTimestamp - a.createdAtTimestamp;
      return b.viewsCount - a.viewsCount;
    });
  }, [data.longs, cleanQuery, sortBy]);

  // 4. Filtrage et Tri des Lives
  const filteredLives = useMemo(() => {
    let list = data.lives.filter(
      (l) =>
        !cleanQuery ||
        l.title.toLowerCase().includes(cleanQuery) ||
        l.creatorName.toLowerCase().includes(cleanQuery) ||
        l.category.toLowerCase().includes(cleanQuery)
    );
    return list.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAtTimestamp - a.createdAtTimestamp;
      return b.viewersCount - a.viewersCount;
    });
  }, [data.lives, cleanQuery, sortBy]);

  // 5. Filtrage et Tri des Sons
  const filteredSounds = useMemo(() => {
    let list = data.sounds.filter(
      (s) =>
        !cleanQuery ||
        s.title.toLowerCase().includes(cleanQuery) ||
        s.artist.toLowerCase().includes(cleanQuery)
    );
    return list.sort((a, b) => b.usesCount - a.usesCount);
  }, [data.sounds, cleanQuery]);

  // 6. Filtrage des Hashtags
  const filteredHashtags = useMemo(() => {
    let list = data.hashtags.filter(
      (h) => !cleanQuery || h.tag.toLowerCase().includes(cleanQuery)
    );
    return list.sort((a, b) => b.viewsCount - a.viewsCount);
  }, [data.hashtags, cleanQuery]);

  const handleTabClick = (tabId: SearchTabType) => {
    try {
      playTapBeep();
    } catch {}
    onTabChange(tabId);
  };

  const handleSortSelect = (sort: SearchSortOption) => {
    try {
      playTapBeep();
    } catch {}
    onSortChange(sort);
    setIsSortDropdownOpen(false);
  };

  return (
    <div className={`flex flex-col flex-1 min-h-0 select-none ${className}`}>
      {/* =====================================================================
          1. MENU DE NAVIGATION HORIZONTAL (SCROLLABLE TABS) SOUS LA RECHERCHE
         ===================================================================== */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-400/40'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ===================================================================
            2. BOUTON DE FILTRE RAPIDE "TRIER PAR"
           =================================================================== */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsSortDropdownOpen((prev) => !prev)}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Options de tri"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Trier par :</span>
            <span className="text-blue-300">
              {sortBy === 'most_viewed' ? 'Les plus vues' : 'Nouveautés'}
            </span>
          </button>

          {isSortDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl bg-slate-900 border border-white/20 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95">
              <button
                type="button"
                onClick={() => handleSortSelect('most_viewed')}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  sortBy === 'most_viewed'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <span>🔥 Les plus vues</span>
                {sortBy === 'most_viewed' && <span>✓</span>}
              </button>

              <button
                type="button"
                onClick={() => handleSortSelect('newest')}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  sortBy === 'newest'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <span>✨ Nouveautés</span>
                {sortBy === 'newest' && <span>✓</span>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          3. CONTENU DES RÉSULTATS PAR ONGLET
         ===================================================================== */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* --- ONGLET TOP (COMBINÉ) --- */}
        {activeTab === 'top' && (
          <div className="space-y-5">
            {/* Créateurs en vedette */}
            {filteredCreators.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
                  <span>Créateurs Wameet</span>
                  <button
                    type="button"
                    onClick={() => onTabChange('users')}
                    className="text-blue-400 hover:underline"
                  >
                    Voir tout
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredCreators.slice(0, 2).map((creator) => (
                    <div
                      key={creator.id}
                      onClick={() => onSelectCreator(creator)}
                      className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/40 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-800 border border-white/20 shrink-0">
                          <img
                            src={creator.avatarUrl}
                            alt={creator.name}
                            className="w-full h-full object-cover"
                          />
                          {creator.isLiveNow && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-rose-500 border-2 border-slate-900" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-white truncate">
                              {creator.name}
                            </span>
                            {creator.verified && (
                              <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {creator.handle}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold block">
                            {creator.followersCount.toLocaleString()} abonnés
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-[11px] font-bold transition-all shrink-0"
                      >
                        Profil ➔
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lives en cours */}
            {filteredLives.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-rose-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>Lives en cours</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredLives.map((live) => {
                    const matchedCreator = data.creators.find(
                      (c) => c.handle === live.creatorHandle
                    );
                    return (
                      <div
                        key={live.id}
                        onClick={() => {
                          if (matchedCreator) {
                            onSelectCreator(matchedCreator);
                          } else if (onSelectLive) {
                            onSelectLive(live);
                          }
                        }}
                        className="relative rounded-2xl overflow-hidden aspect-video bg-slate-800 border border-rose-500/30 shadow-lg group cursor-pointer flex flex-col justify-between p-3"
                      >
                        <img
                          src={live.thumbnailUrl}
                          alt={live.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/50" />

                        <div className="relative z-10 flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span>Live</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                            👁️ {live.viewersCount.toLocaleString()}
                          </span>
                        </div>

                        <div className="relative z-10 space-y-1">
                          <p className="text-xs font-extrabold text-white line-clamp-1 drop-shadow-sm">
                            {live.title}
                          </p>
                          <p className="text-[11px] text-slate-300 font-medium">
                            {live.creatorName} • {live.category}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Shorts populaires */}
            {filteredShorts.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                  Vidéos Shorts
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {filteredShorts.slice(0, 6).map((short) => (
                    <div
                      key={short.id}
                      onClick={() => onSelectVideo && onSelectVideo(short)}
                      className="group relative rounded-2xl overflow-hidden aspect-[9/14] bg-slate-800 border border-white/10 hover:border-blue-400/50 shadow-md transition-all cursor-pointer flex flex-col justify-between p-2.5"
                    >
                      <img
                        src={short.thumbnailUrl}
                        alt={short.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                      <div className="relative z-10 text-right">
                        <span className="text-[10px] font-bold text-white/90 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-xs">
                          👁️ {(short.viewsCount / 1000).toFixed(1)}k
                        </span>
                      </div>

                      <div className="relative z-10 space-y-1">
                        <p className="text-xs font-bold text-white line-clamp-2 leading-tight">
                          {short.title}
                        </p>
                        <span className="text-[10px] text-slate-300 block truncate font-medium">
                          {short.creatorName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- ONGLET UTILISATEURS (CRÉATEURS) --- */}
        {activeTab === 'users' && (
          <div className="space-y-2.5">
            {filteredCreators.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Aucun créateur trouvé pour "{query}".
              </div>
            ) : (
              filteredCreators.map((creator) => (
                <div
                  key={creator.id}
                  onClick={() => onSelectCreator(creator)}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden bg-slate-800 border-2 border-white/20 shrink-0">
                      <img
                        src={creator.avatarUrl}
                        alt={creator.name}
                        className="w-full h-full object-cover"
                      />
                      {creator.isLiveNow && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-slate-900" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-black text-white truncate">
                          {creator.name}
                        </h4>
                        {creator.verified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        )}
                        {creator.badge && (
                          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-black">
                            {creator.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{creator.handle}</p>
                      <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                        {creator.bio}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-bold">
                        <span>{creator.followersCount.toLocaleString()} abonnés</span>
                        <span>•</span>
                        <span className="text-emerald-400">
                          {creator.salesCount || 0} ventes Nanasore
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all shadow-md shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Voir Profil</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- ONGLET SHORTS --- */}
        {activeTab === 'shorts' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredShorts.map((short) => (
              <div
                key={short.id}
                onClick={() => onSelectVideo && onSelectVideo(short)}
                className="group relative rounded-2xl overflow-hidden aspect-[9/15] bg-slate-800 border border-white/10 hover:border-blue-400/50 shadow-md transition-all cursor-pointer flex flex-col justify-between p-3"
              >
                <img
                  src={short.thumbnailUrl}
                  alt={short.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35" />

                <div className="relative z-10 flex items-center justify-between text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded-md bg-black/60 text-white/90">
                    👁️ {(short.viewsCount / 1000).toFixed(1)}k
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-600/80 text-white flex items-center gap-0.5">
                    ❤️ {(short.likesCount / 1000).toFixed(1)}k
                  </span>
                </div>

                <div className="relative z-10 space-y-1">
                  <p className="text-xs font-extrabold text-white line-clamp-2 leading-tight">
                    {short.title}
                  </p>
                  <p className="text-[11px] text-slate-300 font-medium truncate">
                    {short.creatorName}
                  </p>
                  {short.productTag && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-black truncate max-w-full">
                      <ShoppingBag className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{short.productTag.name}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- ONGLET VIDÉOS LONGUES --- */}
        {activeTab === 'longs' && (
          <div className="space-y-3">
            {filteredLongs.map((long) => (
              <div
                key={long.id}
                onClick={() => onSelectVideo && onSelectVideo(long)}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 transition-all flex flex-col sm:flex-row gap-3 cursor-pointer group"
              >
                <div className="relative w-full sm:w-44 aspect-video rounded-xl overflow-hidden bg-slate-800 shrink-0">
                  <img
                    src={long.thumbnailUrl}
                    alt={long.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-black">
                    {long.duration}
                  </span>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-white line-clamp-2 leading-snug group-hover:text-blue-300 transition-colors">
                      {long.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      {long.creatorName} ({long.creatorHandle})
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2 font-semibold">
                    <span>{long.category}</span>
                    <span>•</span>
                    <span>{(long.viewsCount / 1000).toFixed(0)}k vues</span>
                    <span>•</span>
                    <span>{long.createdAt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- ONGLET LIVES EN COURS --- */}
        {activeTab === 'lives' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredLives.map((live) => {
              const matchedCreator = data.creators.find((c) => c.handle === live.creatorHandle);
              return (
                <div
                  key={live.id}
                  onClick={() => {
                    if (matchedCreator) onSelectCreator(matchedCreator);
                    else if (onSelectLive) onSelectLive(live);
                  }}
                  className="relative rounded-2xl overflow-hidden aspect-video bg-slate-800 border border-rose-500/40 shadow-xl group cursor-pointer flex flex-col justify-between p-3.5"
                >
                  <img
                    src={live.thumbnailUrl}
                    alt={live.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/50" />

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black uppercase flex items-center gap-1.5 shadow-md">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span>Live Direct</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold">
                      👁️ {live.viewersCount.toLocaleString()} spectateurs
                    </span>
                  </div>

                  <div className="relative z-10 space-y-1.5">
                    <p className="text-sm font-extrabold text-white line-clamp-1 drop-shadow-md">
                      {live.title}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-200 font-medium">
                        {live.creatorName}
                      </span>
                      {live.productLiveBadge && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black">
                          {live.productLiveBadge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- ONGLET SONS --- */}
        {activeTab === 'sounds' && (
          <div className="space-y-2.5">
            {filteredSounds.map((snd) => (
              <div
                key={snd.id}
                onClick={() => onSelectSound && onSelectSound(snd)}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/40 transition-all flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                    <img
                      src={snd.coverUrl}
                      alt={snd.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 fill-white text-white" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                        {snd.title}
                      </h4>
                      {snd.isTrending && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px] font-black border border-amber-400/30">
                          Viral 🔥
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{snd.artist}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {snd.duration} • {snd.usesCount.toLocaleString()} vidéos
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  Utiliser ce son 🎵
                </button>
              </div>
            ))}
          </div>
        )}

        {/* --- ONGLET HASHTAGS --- */}
        {activeTab === 'hashtags' && (
          <div className="space-y-2">
            {filteredHashtags.map((h) => (
              <div
                key={h.id}
                onClick={() => onSelectHashtag && onSelectHashtag(h)}
                className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/40 transition-all flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                    #
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-blue-300 transition-colors">
                      {h.tag}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {(h.viewsCount / 1000000).toFixed(1)}M de vues • {h.postsCount} publications
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsView;
