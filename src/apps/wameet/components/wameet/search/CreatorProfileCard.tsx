import React, { useState } from 'react';
import {
  CheckCircle2,
  Users,
  Heart,
  ShoppingBag,
  Radio,
  Play,
  MessageCircle,
  X,
  Share2,
  Sparkles,
  ExternalLink,
  Store,
  Clock,
  Film
} from 'lucide-react';
import { CreatorProfile, CreatorPlaylistItem } from './types';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface CreatorProfileCardProps {
  creator: CreatorProfile;
  onClose: () => void;
  onSelectPlaylistItem?: (item: CreatorPlaylistItem) => void;
  onOpenChat?: (creator: CreatorProfile) => void;
  className?: string;
}

/**
 * COMPOSANT CreatorProfileCard (Wameet Video Search)
 * Directive Prompt 24 :
 * "Au clic sur le résultat d'un créateur ou d'un Live, cela n'ouvre pas juste la vidéo,
 * mais une carte de profil. Cette carte affiche sa photo, ses stats, et sa PlayListe alignée
 * sous forme de grille correspondant aux catégories citées."
 */
export const CreatorProfileCard: React.FC<CreatorProfileCardProps> = ({
  creator,
  onClose,
  onSelectPlaylistItem,
  onOpenChat,
  className = ''
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<
    'all' | 'shorts' | 'longs' | 'lives'
  >('all');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(creator.followersCount);

  const handleFollowToggle = () => {
    try {
      playValidationBeep();
    } catch {}
    setIsFollowing((prev) => !prev);
    setFollowersCount((prev) => (isFollowing ? prev - 1 : prev + 1));
  };

  const handlePlayItem = (item: CreatorPlaylistItem) => {
    try {
      playTapBeep();
    } catch {}
    if (onSelectPlaylistItem) {
      onSelectPlaylistItem(item);
    }
  };

  // Filtrage de la playlist selon la catégorie choisie
  const filteredPlaylist =
    activeCategoryFilter === 'all'
      ? creator.playlist
      : creator.playlist.filter((p) => p.category === activeCategoryFilter);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-t-[32px] sm:rounded-[32px] bg-slate-900 border border-white/15 text-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* =====================================================================
            1. BANNIÈRE SUPÉRIEURE AVEC BOUTON FERMER
           ===================================================================== */}
        <div className="relative h-28 sm:h-32 bg-gradient-to-r from-blue-700 via-indigo-700 to-rose-700 p-4 flex items-start justify-between">
          {/* Halos d'ambiance */}
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />

          <div className="relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-[11px] font-bold text-white/90 border border-white/20">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Profil Créateur Wameet</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fiche profil"
            className="relative z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/75 text-white/90 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* =====================================================================
            2. EN-TÊTE DU CRÉATEUR (AVATAR, STATUTS, BADGES)
           ===================================================================== */}
        <div className="px-5 pb-3 -mt-12 relative z-10 space-y-3">
          <div className="flex items-end justify-between gap-3">
            {/* Avatar avec anneau pulsant si en direct */}
            <div className="relative">
              {creator.isLiveNow && (
                <span className="absolute -inset-1 rounded-full bg-rose-500 animate-ping opacity-75" />
              )}
              <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden border-4 border-slate-900 bg-slate-800 shadow-xl">
                <img
                  src={creator.avatarUrl}
                  alt={creator.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {creator.isLiveNow && (
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-rose-600 border border-white/80 text-[9px] font-black uppercase text-white shadow-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>Live</span>
                </div>
              )}
            </div>

            {/* Boutons d'interaction rapide : Suivre & Message */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFollowToggle}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${
                  isFollowing
                    ? 'bg-slate-800 text-slate-200 border border-white/20 hover:bg-slate-700'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/40'
                }`}
              >
                {isFollowing ? 'Abonné ✓' : 'S’abonner +'}
              </button>

              {onOpenChat && (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      playTapBeep();
                    } catch {}
                    onOpenChat(creator);
                  }}
                  className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer"
                  title="Discuter sur Wameet"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Nom, Handle & Badges */}
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                {creator.name}
              </h3>
              {creator.verified && (
                <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400/20 shrink-0" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-xs font-medium text-slate-400">{creator.handle}</span>
              {creator.badge && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black">
                  {creator.badge}
                </span>
              )}
              <span className="text-[10px] text-slate-400">• {creator.category}</span>
            </div>

            <p className="mt-2 text-xs text-slate-300 leading-relaxed line-clamp-2">
              {creator.bio}
            </p>
          </div>

          {/* ===================================================================
              3. STATISTIQUES DU CRÉATEUR
             =================================================================== */}
          <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-2xl bg-white/5 border border-white/10 text-center">
            <div>
              <p className="text-xs sm:text-sm font-black text-white">
                {followersCount.toLocaleString('fr-FR')}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">Abonnés</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-white">
                {(creator.likesCount / 1000).toFixed(1)}k
              </p>
              <p className="text-[10px] text-slate-400 font-medium">J'aime</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-emerald-400">
                {creator.salesCount ? `${creator.salesCount.toLocaleString('fr-FR')}` : '4.2k'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">Ventes NaNa</p>
            </div>
          </div>
        </div>

        {/* =====================================================================
            4. ONGLETS DE CATÉGORIES DE LA PLAYLISTE
           ===================================================================== */}
        <div className="px-5 pt-1 pb-2 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Toutes', count: creator.playlist.length },
            {
              id: 'shorts',
              label: 'Vidéos Shorts',
              count: creator.playlist.filter((p) => p.category === 'shorts').length
            },
            {
              id: 'longs',
              label: 'Vidéos Longues',
              count: creator.playlist.filter((p) => p.category === 'longs').length
            },
            {
              id: 'lives',
              label: 'Lives en cours',
              count: creator.playlist.filter((p) => p.category === 'lives').length
            }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                try {
                  playTapBeep();
                } catch {}
                setActiveCategoryFilter(tab.id as any);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeCategoryFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-1 opacity-75 text-[10px]">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* =====================================================================
            5. PLAYLISTE ALIGNÉE SOUS FORME DE GRILLE
           ===================================================================== */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
          {filteredPlaylist.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Aucune vidéo dans cette catégorie pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {filteredPlaylist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handlePlayItem(item)}
                  className="group relative rounded-2xl overflow-hidden aspect-[9/14] bg-slate-800 border border-white/10 hover:border-blue-400/60 shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between p-2.5"
                >
                  {/* Image de la vignette */}
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Dégradé supérieur et inférieur */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

                  {/* Badge supérieur (Durée ou En direct) */}
                  <div className="relative z-10 flex items-center justify-between gap-1 text-[10px] font-bold">
                    {item.category === 'lives' ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black uppercase flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>Live</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white/90 border border-white/15">
                        {item.duration}
                      </span>
                    )}

                    <span className="text-white/80 font-medium">
                      {(item.viewsCount / 1000).toFixed(1)}k vues
                    </span>
                  </div>

                  {/* Bouton Play au centre au survol */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <div className="w-10 h-10 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Contenu inférieur : Titre + Tag Produit */}
                  <div className="relative z-10 space-y-1">
                    <p className="text-xs font-bold text-white line-clamp-2 leading-snug drop-shadow-sm">
                      {item.title}
                    </p>

                    {item.productTag && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-emerald-500/25 border border-emerald-400/40 text-[9px] font-black text-emerald-300 truncate">
                        <ShoppingBag className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">
                          {item.productTag.name} • {item.productTag.priceFcfa.toLocaleString()} F
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorProfileCard;
