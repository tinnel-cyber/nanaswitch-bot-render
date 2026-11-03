import React, { useState } from 'react';
import {
  Film,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  Video,
  Radio,
  Music,
  Hash,
  Play,
  RotateCcw,
  Smartphone,
  Info,
  CheckCircle2
} from 'lucide-react';
import { ImmersiveVideoSearch } from './ImmersiveVideoSearch';
import { FloatingSearchBar } from './FloatingSearchBar';
import { CreatorProfileCard } from './CreatorProfileCard';
import { MOCK_CREATORS } from './mockSearchData';

export const ImmersiveVideoSearchShowcase: React.FC = () => {
  const [isVideoDimmed, setIsVideoDimmed] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedCreatorModal, setSelectedCreatorModal] = useState<any>(null);

  const sampleVideos = [
    {
      id: 'demo-reel-1',
      title: 'Arrivage Chaussures Cuir Véritable Ouaga',
      creator: 'Awa Ouédraogo (@awa.empire.bf)',
      posterUrl:
        'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop&q=80',
      badge: '🛍️ Shopping Live NaNa POS'
    },
    {
      id: 'demo-reel-2',
      title: 'Concert Live Acoustique Abidjan',
      creator: 'Ibrahim Konaté (@ibrahim.k)',
      posterUrl:
        'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80',
      badge: '🔴 Live Musical'
    }
  ];

  const currentVideo = sampleVideos[activeReelIndex];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6 select-none">
      {/* =====================================================================
          EN-TÊTE DE PRÉSENTATION DU PROMPT 24
         ===================================================================== */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-2">
              <Search className="w-3.5 h-3.5" />
              <span>Prompt 24 • UI/UX Premium Wameet Reels / Live</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Immersive Video Search
            </h1>
            <p className="text-sm text-blue-100 max-w-2xl mt-1">
              Barre de recherche fine translucide par-dessus la vidéo, transition fluide d'expansion (scale-95 vers scale-100), historique avec icône d'horloge, onglets défilants, tri instantané et cartes de profils créateurs avec playlists en grille.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveReelIndex((prev) => (prev === 0 ? 1 : 0));
              showToast('Changement de Reel en arrière-plan !');
            }}
            className="px-4 py-2.5 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Changer de Vidéo</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-blue-600 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-lg">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =====================================================================
          CHÂSSIS DU SMARTPHONE AVEC IMMERSIVE VIDEO SEARCH
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne gauche : Simulateur Téléphone */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-[400px] aspect-[9/16] rounded-[42px] bg-slate-950 border-[7px] border-slate-800 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] overflow-hidden relative flex flex-col">
            {/* Encoche Smartphone */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-800 rounded-full z-30" />

            {/* VIDÉO EN ARRIÈRE-PLAN AVEC EFFET D'ASSOMBRISSEMENT LORS DE LA RECHERCHE */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <img
                src={currentVideo.posterUrl}
                alt={currentVideo.title}
                className={`w-full h-full object-cover transition-all duration-300 ${
                  isVideoDimmed ? 'brightness-40 blur-[2px] scale-102' : 'brightness-90 scale-100'
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

              {/* Informations du Reel superposées en bas */}
              <div className="absolute bottom-6 left-4 right-4 z-20 text-white space-y-1.5 pointer-events-none">
                <span className="inline-block px-2.5 py-1 rounded-full bg-blue-600/80 backdrop-blur-md text-[10px] font-black uppercase">
                  {currentVideo.badge}
                </span>
                <h3 className="text-sm sm:text-base font-extrabold leading-tight">
                  {currentVideo.title}
                </h3>
                <p className="text-xs text-slate-300 font-medium">
                  {currentVideo.creator}
                </p>
              </div>
            </div>

            {/* ===============================================================
                LE COMPOSANT IMMERSIVE VIDEO SEARCH INTÉGRÉ
               =============================================================== */}
            <ImmersiveVideoSearch
              onSearchStateChange={(isOpen) => {
                setIsVideoDimmed(isOpen);
              }}
              onSelectVideo={(video) => {
                showToast(`🎬 Lecture de : "${video.title}"`);
              }}
              onSelectLive={(live) => {
                showToast(`🔴 Rejoindre le Live : "${live.title}"`);
              }}
              onOpenChatWithCreator={(creator) => {
                showToast(`💬 Démarrer le chat Wameet avec ${creator.name}`);
              }}
              floatingBarClassName="top-8 left-4 right-4"
            />
          </div>
        </div>

        {/* Colonne droite : Guide des fonctionnalités et raccourcis */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Directives UI/UX Implémentées</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">
                <p className="font-bold text-blue-950 dark:text-blue-200 mb-0.5">
                  1. FloatingSearchBar (Sur la vidéo)
                </p>
                <p className="text-[11px] leading-relaxed">
                  Fine barre translucide (`bg-white/10 backdrop-blur-sm border-white/20`), icône de loupe subtile et z-index 40 optimisé pour préserver le swipe tactile des vidéos.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40">
                <p className="font-bold text-purple-950 dark:text-purple-200 mb-0.5">
                  2. ActiveSearchOverlay & Transition Fluide
                </p>
                <p className="text-[11px] leading-relaxed">
                  Au clic, la vidéo s'assombrit (`brightness-40`) et l'écran s'ouvre avec une expansion fluide (scale-95 vers scale-100, opacity-0 vers 100 via Framer Motion).
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                <p className="font-bold text-amber-950 dark:text-amber-200 mb-0.5">
                  3. Historique d'Horloge (Avant d'écrire)
                </p>
                <p className="text-[11px] leading-relaxed">
                  Affiche la liste des phrases récentes ("Chaussures Ouaga", "Concert Live") avec l'icône d'horloge 🕒. Clic direct pour lancer la recherche.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                <p className="font-bold text-emerald-950 dark:text-emerald-200 mb-0.5">
                  4. Onglets Scrollables & Tri Rapide
                </p>
                <p className="text-[11px] leading-relaxed">
                  Onglets : Top, Utilisateurs, Shorts, Longues, Lives, Sons, Hashtags. Filtre "Trier par" : Les plus vues et Nouveautés.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                <p className="font-bold text-rose-950 dark:text-rose-200 mb-0.5">
                  5. CreatorProfileCard (Fiche Créateur & PlayListes)
                </p>
                <p className="text-[11px] leading-relaxed">
                  Le clic sur un créateur ou un Live ouvre la carte complète avec stats (Abonnés, J'aime, Ventes NaNa) et grille de playliste alignée.
                </p>
              </div>
            </div>

            {/* Test rapide : Ouvrir directement une fiche créateur */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 block mb-2">
                Aperçu rapide direct des cartes créateurs :
              </span>
              <div className="flex flex-wrap gap-2">
                {MOCK_CREATORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCreatorModal(c)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Fiche Créateur en test direct */}
      {selectedCreatorModal && (
        <CreatorProfileCard
          creator={selectedCreatorModal}
          onClose={() => setSelectedCreatorModal(null)}
          onSelectPlaylistItem={(item) => {
            showToast(`Lecture : "${item.title}"`);
          }}
          onOpenChat={(c) => {
            showToast(`Chat avec ${c.name}`);
          }}
        />
      )}
    </div>
  );
};

export default ImmersiveVideoSearchShowcase;
