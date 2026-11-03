/**
 * @file SallesVipDiscoveryScreen.tsx
 * @description Écran catalogue multi-salles pour l'e-learning VIP (Routes: /salles-vip, /vip)
 * Affiche la liste des salles d'experts, les sessions en direct, et permet d'accéder à une salle individuelle.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Sparkles,
  Search,
  Radio,
  Users,
  Video,
  Play,
  ArrowRight,
  ArrowLeft,
  Plus,
  ShieldCheck,
  Star,
  BookOpen,
  Filter,
  CheckCircle2,
  X,
  Upload,
  ExternalLink
} from 'lucide-react';
import { VipRoom, getVipRooms, subscribeToVipRooms, saveVipRoom } from '../../services/vipRoomsService';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import ComposantUploadVideo from '../../../../components/ComposantUploadVideo';

export interface SallesVipDiscoveryScreenProps {
  onSelectRoom: (roomId: string) => void;
  onBackToHome?: () => void;
  currentUser?: any;
}

export const SallesVipDiscoveryScreen: React.FC<SallesVipDiscoveryScreenProps> = ({
  onSelectRoom,
  onBackToHome,
  currentUser
}) => {
  const [rooms, setRooms] = useState<VipRoom[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS');
  const [onlyLiveFilter, setOnlyLiveFilter] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Formulaire de création de Salle VIP
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Fintech & Télécoms');
  const [newDescription, setNewDescription] = useState('');
  const [newLiveUrl, setNewLiveUrl] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('Module 1 : Introduction & Fondamentaux');
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Abonnement en temps réel aux salles VIP Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToVipRooms((data) => {
      setRooms(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Catégories uniques disponibles
  const categories = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach(r => {
      if (r.category) set.add(r.category);
    });
    return ['TOUS', ...Array.from(set)];
  }, [rooms]);

  // Filtrage intelligent des salles
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchSearch =
        searchQuery === '' ||
        room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.expertName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        selectedCategory === 'TOUS' || room.category === selectedCategory;

      const matchLive = !onlyLiveFilter || room.isLiveNow;

      return matchSearch && matchCategory && matchLive;
    });
  }, [rooms, searchQuery, selectedCategory, onlyLiveFilter]);

  // Gestion de la création d'une nouvelle salle
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    setIsSubmitting(true);
    playValidationBeep();

    const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newRoom: VipRoom = {
      id: roomId,
      title: newTitle.trim(),
      subtitle: newDescription.trim().substring(0, 90) + '...',
      description: newDescription.trim(),
      expertName: currentUser?.storeName || currentUser?.name || currentUser?.displayName || 'Expert Formateur NaNa',
      expertRole: 'Formateur & Coach Certifié',
      expertAvatar: currentUser?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      category: newCategory,
      bannerUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
      badge: 'Masterclass VIP',
      accessType: 'VIP',
      priceLabel: 'Inclus VIP',
      rating: 5.0,
      studentsCount: 1,
      isLiveNow: Boolean(newLiveUrl.trim()),
      liveStreamUrl: newLiveUrl.trim() || 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      tags: [newCategory, 'E-learning', 'VIP'],
      lessons: newLessonVideoUrl.trim() ? [
        {
          id: `lesson-${Date.now()}`,
          title: newLessonTitle.trim() || 'Module 1 : Leçon Principale',
          duration: '20:00',
          videoUrl: newLessonVideoUrl.trim(),
          description: 'Vidéo hébergée en haute performance sur notre infrastructure Cloud.',
          thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
          isFreePreview: true
        }
      ] : [
        {
          id: `lesson-demo`,
          title: 'Module 1 : Session d’introduction',
          duration: '15:00',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          description: 'Présentation des objectifs du cours et méthodologie pratique.',
          isFreePreview: true
        }
      ]
    };

    try {
      await saveVipRoom(newRoom);
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewLiveUrl('');
      setNewLessonVideoUrl('');
      onSelectRoom(roomId);
    } catch (err) {
      console.error('[SALLES VIP] Erreur création de salle :', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-[#4169E1] selection:text-white">
      {/* ─── Barre de Navigation Supérieure : Bleu Royal (#4169E1) ─────────── */}
      <header className="sticky top-0 z-40 bg-[#4169E1] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onBackToHome();
                }}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
                title="Retour"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#4169E1] flex items-center justify-center font-black shadow-md">
                <GraduationCap className="w-6 h-6 text-[#4169E1]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                    Salles VIP E-learning
                  </h1>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                    Multi-Salles
                  </span>
                </div>
                <p className="text-[11px] text-blue-100 hidden sm:block">
                  Salons d'experts & masterclasses avec cours vidéo et streaming direct
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-white hover:bg-blue-50 text-[#4169E1] font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 border border-white"
            >
              <Plus className="w-4 h-4 stroke-[3] text-[#4169E1]" />
              <span>Créer une Salle</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Bannière Héro & Métriques : Blanc & Bleu Royal ───────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-white py-8 sm:py-12 border-b border-slate-200">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mb-8">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-[#4169E1] bg-blue-100/70 border border-[#4169E1]/30 px-3 py-1 rounded-full mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#4169E1]" />
              Académie & Salons Privés des Formateurs
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-3">
              Apprenez auprès des experts d'élite et suivez les directs interactifs
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Chaque Salle VIP dispose de deux espaces dédiés : un catalogue de leçons vidéo avec lecteur haute définition et un espace de direct temps réel avec chat interactif WebSocket.
            </p>
          </div>

          {/* 4 Compteurs Métriques : Cartes Blanc Pur (#FFFFFF) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <BookOpen className="w-4 h-4 text-[#4169E1]" />
                <span>Salles VIP</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{rooms.length}</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <Radio className="w-4 h-4 text-rose-600 animate-pulse" />
                <span>En Direct Actif</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-rose-600">
                {rooms.filter(r => r.isLiveNow).length}
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <Users className="w-4 h-4 text-[#4169E1]" />
                <span>Étudiants Actifs</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {rooms.reduce((acc, r) => acc + (r.studentsCount || 0), 0)}+
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <ShieldCheck className="w-4 h-4 text-[#4169E1]" />
                <span>Satisfaction</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-[#4169E1]">4.9 / 5.0</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Barre de Recherche & Filtres ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          {/* Champ de recherche */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une salle, un formateur ou un thème..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border-2 border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4169E1] transition shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle Direct Uniquement */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setOnlyLiveFilter(!onlyLiveFilter);
            }}
            className={`px-3.5 py-2.5 rounded-2xl border-2 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              onlyLiveFilter
                ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${onlyLiveFilter ? 'bg-rose-500 animate-ping' : 'bg-slate-400'}`} />
            <span>Direct en cours seulement</span>
          </button>
        </div>

        {/* Pilules de catégories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                playTapBeep();
                setSelectedCategory(cat);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#4169E1] text-white shadow-md shadow-blue-500/20'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {cat === 'TOUS' ? '🏛️ Toutes les Salles' : cat}
            </button>
          ))}
        </div>
      </section>

      {/* ─── Grille des Salles VIP ────────────────────────────────────────── */}
      {/* ─── Grille des Salles VIP : Cartes Blanc Pur (#FFFFFF) ────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 w-full flex-1">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-3xl bg-slate-100 border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-slate-200 p-8 shadow-xs">
            <GraduationCap className="w-12 h-12 text-[#4169E1] mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">Aucune salle ne correspond à votre recherche</h3>
            <p className="text-xs text-slate-500 mb-6">
              Modifiez vos critères de recherche ou soyez le premier à créer cette salle de cours.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('TOUS');
                setOnlyLiveFilter(false);
              }}
              className="px-4 py-2 rounded-xl bg-[#4169E1] hover:bg-[#3154b3] text-white text-xs font-bold transition cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <article
                key={room.id}
                className="group relative rounded-3xl bg-white border-2 border-slate-200 hover:border-[#4169E1] transition-all duration-300 flex flex-col overflow-hidden shadow-md hover:shadow-xl"
              >
                {/* Image Bannière */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  <img
                    src={room.bannerUrl}
                    alt={room.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                  {/* Badges en superposition */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#4169E1] text-white shadow-md">
                      {room.badge || 'VIP'}
                    </span>
                    {room.isLiveNow && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white flex items-center gap-1 shadow-md animate-pulse">
                        <Radio className="w-3 h-3" />
                        <span>En Direct</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-md text-[#4169E1] border border-[#4169E1]/30">
                      {room.category}
                    </span>
                  </div>

                  {/* Bouton Play Flottant */}
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      onSelectRoom(room.id);
                    }}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-[#4169E1] hover:bg-[#3154b3] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100 shadow-xl cursor-pointer"
                    title="Accéder à la salle"
                  >
                    <Play className="w-5 h-5 fill-white translate-x-0.5" />
                  </button>
                </div>

                {/* Corps de la Carte : Blanc Pur */}
                <div className="p-5 flex-1 flex flex-col justify-between bg-white">
                  <div>
                    {/* Formateur */}
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={room.expertAvatar}
                        alt={room.expertName}
                        className="w-9 h-9 rounded-full object-cover border-2 border-[#4169E1] shrink-0"
                      />
                      <div className="truncate">
                        <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                          <span className="truncate">{room.expertName}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#4169E1] shrink-0" />
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">{room.expertRole}</p>
                      </div>
                    </div>

                    {/* Titre & Description */}
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-[#4169E1] transition-colors line-clamp-2 mb-2 leading-snug">
                      {room.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                      {room.description}
                    </p>
                  </div>

                  {/* Pied de Carte : Métriques & Bouton d'entrée */}
                  <div>
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 text-[#4169E1]" />
                        <span className="font-semibold text-slate-700">{room.lessons?.length || 0} Leçons</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        <span className="font-bold text-slate-800">{room.rating.toFixed(1)}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#4169E1]" />
                        <span>{room.studentsCount} élèves</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        onSelectRoom(room.id);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#4169E1] hover:bg-[#3154b3] text-white font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 active:scale-95"
                    >
                      <span>Entrer dans la Salle VIP</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* ─── Modale de Création d'une Salle VIP (Blanc & Bleu Royal) ────────── */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-white border-2 border-[#4169E1]/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#4169E1] flex items-center justify-center text-white font-black">
                <Plus className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Créer une Salle VIP E-learning</h3>
                <p className="text-xs text-slate-500">
                  Publiez votre masterclass dans la collection Firebase 'rooms' avec cours vidéo et flux direct.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Titre de la Salle / Masterclass *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Masterclass Commerce International & Wameet 20 Pays"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#4169E1]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Catégorie
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#4169E1]"
                  >
                    <option value="Fintech & Télécoms">Fintech & Télécoms</option>
                    <option value="E-Commerce & Logistique">E-Commerce & Logistique</option>
                    <option value="Intelligence Artificielle">Intelligence Artificielle</option>
                    <option value="Agro-Business & Export">Agro-Business & Export</option>
                    <option value="Leadership & Négociation">Leadership & Négociation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Lien YouTube Live (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={newLiveUrl}
                    onChange={(e) => setNewLiveUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#4169E1]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Description & Objectifs du Cours *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Expliquez ce que vos apprenants vont maîtriser dans cette salle..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#4169E1]"
                />
              </div>

              {/* Section Upload / Vidéo Cloud */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-[#4169E1]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-[#4169E1] tracking-wider flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-[#4169E1]" />
                    <span>Première Leçon Vidéo (Cloud ou URL)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Stockage Cloud Nanasore</span>
                </div>

                <div>
                  <input
                    type="text"
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    placeholder="Titre de la leçon (Ex: Module 1 : Introduction)"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 mb-2 focus:border-[#4169E1]"
                  />
                  <input
                    type="text"
                    value={newLessonVideoUrl}
                    onChange={(e) => setNewLessonVideoUrl(e.target.value)}
                    placeholder="URL vidéo directe (Cloud, MP4 ou YouTube)"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-[#4169E1]"
                  />
                </div>

                <div className="pt-2">
                  <p className="text-[11px] text-slate-600 mb-2 font-medium">
                    💡 Vous pouvez aussi uploader directement votre vidéo vers notre stockage Cloud :
                  </p>
                  <ComposantUploadVideo
                    onVideoUploaded={(url) => {
                      setNewLessonVideoUrl(url);
                      playValidationBeep();
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#4169E1] hover:bg-[#3154b3] text-white font-black text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Publication en cours...' : 'Publier la Salle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SallesVipDiscoveryScreen;
