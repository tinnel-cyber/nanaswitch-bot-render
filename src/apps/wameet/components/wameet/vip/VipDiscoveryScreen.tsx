import React, { useState, useMemo, useEffect } from 'react';
import {
  Crown,
  Sparkles,
  Search,
  Filter,
  GraduationCap,
  Briefcase,
  Radio,
  Star,
  ChevronLeft,
  ShieldCheck,
  Award,
  Users,
  Compass,
  Zap,
  ArrowRight
} from 'lucide-react';
import {
  VipDiscoveryScreenProps,
  VipBusinessLounge,
  VipCourseRoom,
  VipFilterCategory
} from './types';
import {
  MOCK_VIP_BUSINESS_LOUNGES,
  MOCK_VIP_COURSE_ROOMS
} from './mockVipData';
import { InfiniteCarouselRow } from './InfiniteCarouselRow';
import { VipBusinessLoungeCard } from './VipBusinessLoungeCard';
import { VipCourseRoomCard } from './VipCourseRoomCard';
import { VipRoomDetailModal } from './VipRoomDetailModal';
import { VipPaywallModal } from './VipPaywallModal';
import { VipCourseRoomView } from './VipCourseRoomView';
import { VipBusinessLoungeView } from './VipBusinessLoungeView';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';
import { fetchSyncedVipRooms } from '../../../../../services/wameetSyncService';

/**
 * PROMPT 26 : Le Hub de Découverte (UI/UX des Carrousels VIP)
 * Mission : UI/UX Premium - Le "Hub VIP" (Découverte des Salles & Salons Wameet)
 * 
 * Directives UI/UX au millimètre :
 * - L'Écran Hub (VipDiscoveryScreen) : Un design sombre et luxueux (bg-slate-950 text-white).
 * - Carrousels Infinis (InfiniteCarouselRow) qui font défiler horizontalement les espaces.
 * - Section 1 : "Salons d'Affaires & Coaching" (tons or/noir, photo coach, badge Abonnement, note moyenne).
 * - Section 2 : "Salles de Cours & Masterclass" (tons bleu nuit/argent, titre cours, nb étudiants, badge Gratuit/Premium).
 * - Micro-Interactions : hover:scale-105 transition-transform, effet de brillance (shimmer).
 * 
 * PROMPT 30 : Synchronisation temps réel des espaces créés depuis Nanasore via WebSockets
 */
export const VipDiscoveryScreen: React.FC<VipDiscoveryScreenProps> = ({
  businessLounges = MOCK_VIP_BUSINESS_LOUNGES,
  courseRooms = MOCK_VIP_COURSE_ROOMS,
  currentUserProfile,
  onSelectLounge,
  onSelectCourse,
  onBackToApp,
  onCreateVipSpace,
  isLoading = false,
  className = ''
}) => {
  // États de recherche & filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<VipFilterCategory>('ALL');

  // Listes dynamiques en direct (combinées avec le backend synchronisé Nanasore)
  const [liveLounges, setLiveLounges] = useState<VipBusinessLounge[]>(businessLounges);
  const [liveCourses, setLiveCourses] = useState<VipCourseRoom[]>(courseRooms);

  // État de modal détail & vue LMS salle de cours ou salon d'affaires
  const [selectedLounge, setSelectedLounge] = useState<VipBusinessLounge | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<VipCourseRoom | null>(null);
  const [activeCourseRoomForView, setActiveCourseRoomForView] = useState<VipCourseRoom | null>(null);
  const [activeBusinessLoungeForView, setActiveBusinessLoungeForView] = useState<VipBusinessLounge | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Synchronisation initiale et écoute WebSocket des créations depuis Nanasore (Prompt 30)
  useEffect(() => {
    // 1. Récupération des rooms synchronisées depuis l'API REST
    fetchSyncedVipRooms().then((syncedRooms) => {
      if (syncedRooms && syncedRooms.length > 0) {
        syncedRooms.forEach((record) => {
          if (record.roomType === 'COURSE_ROOM') {
            const courseItem: VipCourseRoom = {
              id: record.id,
              title: record.title,
              category: record.category,
              instructorName: record.creatorName,
              instructorRole: record.creatorRole,
              instructorAvatar: record.creatorAvatar,
              isInstructorVerified: record.isCreatorVerified,
              studentsCount: 1,
              accessType: record.accessType === 'FREE' ? 'FREE' : 'PREMIUM',
              badgeLabel: record.accessType === 'FREE' ? 'Accès Gratuit' : 'Premium',
              priceLabel: record.subscriptionPrice.formattedLabel,
              rating: 5.0,
              reviewsCount: 1,
              modulesCount: record.contentPayload.chapters?.length || 1,
              durationHours: record.contentPayload.durationHours || 12,
              level: 'Masterclass',
              tags: record.tags,
              isLiveNow: false,
              bannerUrl: record.bannerUrl,
              hasCertificate: record.contentPayload.hasCertificate ?? true
            };
            setLiveCourses((prev) => {
              if (prev.some((c) => c.id === courseItem.id)) return prev;
              return [courseItem, ...prev];
            });
          } else {
            const loungeItem: VipBusinessLounge = {
              id: record.id,
              title: record.title,
              topic: record.description,
              category: record.category,
              coachName: record.creatorName,
              coachRole: record.creatorRole,
              coachAvatar: record.creatorAvatar,
              coachBio: record.creatorBio,
              isCoachVerified: record.isCreatorVerified,
              isOnline: true,
              rating: 5.0,
              reviewsCount: 1,
              activeMembersCount: 1,
              accessType: 'SUBSCRIPTION',
              badgeLabel: 'Accès sur Abonnement',
              subscriptionPriceLabel: record.subscriptionPrice.formattedLabel,
              tags: record.tags,
              bannerUrl: record.bannerUrl,
              roomCode: record.roomCode
            };
            setLiveLounges((prev) => {
              if (prev.some((l) => l.id === loungeItem.id)) return prev;
              return [loungeItem, ...prev];
            });
          }
        });
      }
    });

    // 2. Connexion WebSocket temps réel pour notification instantanée dans les carrousels
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/haggle`;
      let ws: WebSocket | null = null;

      try {
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.event === 'wameet_vip_room_published') {
              playValidationBeep();
              const { room, roomType } = parsed.data || parsed;
              if (roomType === 'COURSE_ROOM') {
                const newCourse: VipCourseRoom = {
                  id: room.id,
                  title: room.title,
                  category: room.category,
                  instructorName: room.creatorName,
                  instructorRole: room.creatorRole,
                  instructorAvatar: room.creatorAvatar,
                  isInstructorVerified: true,
                  studentsCount: 1,
                  accessType: room.accessType === 'FREE' ? 'FREE' : 'PREMIUM',
                  badgeLabel: 'Nouveau',
                  priceLabel: room.priceLabel || 'Offert',
                  rating: 5.0,
                  reviewsCount: 1,
                  modulesCount: 3,
                  durationHours: 10,
                  level: 'Masterclass',
                  tags: room.tags || [],
                  isLiveNow: false,
                  bannerUrl: room.bannerUrl
                };
                setLiveCourses((prev) => [newCourse, ...prev.filter((c) => c.id !== newCourse.id)]);
                showToast(`🎓 Nouvelle Masterclass publiée depuis Nanasore : ${room.title} !`);
              } else {
                const newLounge: VipBusinessLounge = {
                  id: room.id,
                  title: room.title,
                  topic: room.category,
                  category: room.category,
                  coachName: room.creatorName,
                  coachRole: room.creatorRole,
                  coachAvatar: room.creatorAvatar,
                  isCoachVerified: true,
                  isOnline: true,
                  rating: 5.0,
                  reviewsCount: 1,
                  activeMembersCount: 1,
                  accessType: 'SUBSCRIPTION',
                  badgeLabel: 'Nouveau Salon',
                  subscriptionPriceLabel: room.priceLabel || '25 000 FCFA / mois',
                  tags: room.tags || [],
                  bannerUrl: room.bannerUrl,
                  roomCode: room.roomCode
                };
                setLiveLounges((prev) => [newLounge, ...prev.filter((l) => l.id !== newLounge.id)]);
                showToast(`👑 Nouveau Salon VIP publié depuis Nanasore : ${room.title} !`);
              }
            }
          } catch {
            // Pas de parsing si format non JSON
          }
        };
      } catch {
        // Fallback silencieux si WS indisponible
      }

      return () => {
        if (ws) {
          ws.close();
        }
      };
    }
  }, []);

  // Filtrage des Salons d'Affaires (basé sur liveLounges)
  const filteredLounges = useMemo(() => {
    return liveLounges.filter((lounge) => {
      if (activeCategory === 'COURSES') return false;
      if (activeCategory === 'LIVE_NOW' && !lounge.isLiveNow) return false;
      if (activeCategory === 'TOP_RATED' && lounge.rating < 4.93) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        lounge.title.toLowerCase().includes(query) ||
        lounge.coachName.toLowerCase().includes(query) ||
        lounge.topic.toLowerCase().includes(query) ||
        lounge.tags.some((t) => t.toLowerCase().includes(query))
      );
    });
  }, [liveLounges, activeCategory, searchQuery]);

  // Filtrage des Salles de Cours (basé sur liveCourses)
  const filteredCourses = useMemo(() => {
    return liveCourses.filter((course) => {
      if (activeCategory === 'BUSINESS') return false;
      if (activeCategory === 'LIVE_NOW' && !course.isLiveNow) return false;
      if (activeCategory === 'TOP_RATED' && course.rating < 4.93) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        course.title.toLowerCase().includes(query) ||
        course.instructorName.toLowerCase().includes(query) ||
        course.category.toLowerCase().includes(query) ||
        course.tags.some((t) => t.toLowerCase().includes(query))
      );
    });
  }, [liveCourses, activeCategory, searchQuery]);

  // Total d'espaces
  const totalSpaces = filteredLounges.length + filteredCourses.length;

  const handleLoungeClick = (lounge: VipBusinessLounge) => {
    setSelectedLounge(lounge);
    setSelectedCourse(null);
    setIsPaywallOpen(true);
    onSelectLounge?.(lounge);
  };

  const handleCourseClick = (course: VipCourseRoom) => {
    setSelectedCourse(course);
    setSelectedLounge(null);
    if (course.accessType === 'PREMIUM') {
      setIsPaywallOpen(true);
    } else {
      setIsModalOpen(true);
    }
    onSelectCourse?.(course);
  };

  if (activeBusinessLoungeForView) {
    return (
      <VipBusinessLoungeView
        lounge={activeBusinessLoungeForView}
        onBackToHub={() => setActiveBusinessLoungeForView(null)}
      />
    );
  }

  if (activeCourseRoomForView) {
    return (
      <VipCourseRoomView
        course={activeCourseRoomForView}
        onBackToHub={() => setActiveCourseRoomForView(null)}
      />
    );
  }

  return (
    <div
      className={`min-h-screen bg-slate-950 text-white relative overflow-hidden selection:bg-amber-500/30 selection:text-amber-200 ${className}`}
    >
      {/* =====================================================================
          FOND LUXE ET HALOS AMBIANTS (OBSIDIAN, OR ET BLEU ROYAL PROFOND)
         ===================================================================== */}
      <div className="pointer-events-none absolute -top-40 left-1/4 w-[600px] h-[600px] bg-amber-500/10 blur-[150px] rounded-full" />
      <div className="pointer-events-none absolute top-1/3 -right-28 w-[500px] h-[500px] bg-blue-600/10 blur-[160px] rounded-full" />
      <div className="pointer-events-none absolute bottom-10 left-10 w-[450px] h-[450px] bg-cyan-500/5 blur-[140px] rounded-full" />

      {/* Grille géométrique subtile d'arrière-plan */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.4) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Notification Toast Flottante */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce-subtle">
          <div className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-xs sm:text-sm shadow-[0_10px_35px_rgba(245,158,11,0.5)] flex items-center gap-2 border border-yellow-200">
            <Crown className="w-4 h-4 fill-slate-950" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          1. BARRE DE NAVIGATION HAUTE DU HUB VIP
         ===================================================================== */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-amber-500/20 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Bouton Retour & Logo VIP */}
          <div className="flex items-center gap-3">
            {onBackToApp && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onBackToApp();
                }}
                className="w-10 h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
                title="Retourner aux 4 piliers Wameet"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-[2px] shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                  <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-amber-400 fill-amber-400/30 animate-pulse" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                    <span>Wameet</span>
                    <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                      VIP Hub
                    </span>
                  </h1>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-extrabold uppercase tracking-wide">
                    Élite
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                  Salles de Cours Certifiées & Salons d'Affaires Exclusifs
                </p>
              </div>
            </div>
          </div>

          {/* Profil utilisateur ou CTA Créer un Espace */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-slate-300 font-medium">100% Espaces Vérifiés</span>
            </div>

            {onCreateVipSpace && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onCreateVipSpace();
                }}
                className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition active:scale-95 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Créer mon Espace VIP</span>
                <span className="sm:hidden">Créer VIP</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. SECTION HERO LUXE : STATS & PRÉSENTATION HAUTE VALEUR
         ===================================================================== */}
      <section className="relative px-4 sm:px-6 pt-8 pb-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-600/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-widest shadow-xs">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Cercle Privé & Haute Expérience Wameet</span>
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Accédez aux{' '}
            <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Salons Confidentiels
            </span>{' '}
            & aux{' '}
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Salles de Masterclass
            </span>
          </h2>

          <p className="text-xs sm:text-base text-slate-400 leading-relaxed font-normal">
            Échangez sans filtre avec des dirigeants de haut calibre, rejoignez des cercles d'investissement fermés et formez-vous aux compétences à très haute valeur ajoutée.
          </p>

          {/* Métriques / Compteurs d'Élite */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-3">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-amber-500/20 backdrop-blur-md">
              <div className="text-lg sm:text-2xl font-black text-amber-400">12+</div>
              <div className="text-[11px] text-slate-400 font-medium">Salons d'Affaires Actifs</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-cyan-400/20 backdrop-blur-md">
              <div className="text-lg sm:text-2xl font-black text-cyan-300">28+</div>
              <div className="text-[11px] text-slate-400 font-medium">Masterclass Certifiantes</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
              <div className="text-lg sm:text-2xl font-black text-white">14.8k+</div>
              <div className="text-[11px] text-slate-400 font-medium">Dirigeants & Élèves VIP</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-emerald-500/20 backdrop-blur-md">
              <div className="text-lg sm:text-2xl font-black text-emerald-400">99.4%</div>
              <div className="text-[11px] text-slate-400 font-medium">Taux de Satisfaction</div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            3. BARRE DE RECHERCHE & FILTRES RAPIDES DU HUB
           =================================================================== */}
        <div className="mt-8 max-w-4xl mx-auto space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un salon, un expert, une masterclass, un thème (B2B, IA, Closing...)"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 focus:border-amber-400/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer px-2 py-1 rounded-lg bg-slate-800"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Filtres par Catégorie */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveCategory('ALL');
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeCategory === 'ALL'
                  ? 'bg-white text-slate-950 shadow-md'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Tous les Espaces ({businessLounges.length + courseRooms.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveCategory('BUSINESS');
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeCategory === 'BUSINESS'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'bg-slate-900/80 text-amber-300/90 hover:bg-slate-800 border border-amber-500/30'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-400" />
              <span>💼 Salons d'Affaires & Coaching ({businessLounges.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveCategory('COURSES');
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeCategory === 'COURSES'
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                  : 'bg-slate-900/80 text-cyan-300/90 hover:bg-slate-800 border border-cyan-400/30'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
              <span>🎓 Salles de Cours & Masterclass ({courseRooms.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveCategory('LIVE_NOW');
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeCategory === 'LIVE_NOW'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-slate-900/80 text-red-400 hover:bg-slate-800 border border-red-500/30'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span>🔴 En Direct Maintenant</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveCategory('TOP_RATED');
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeCategory === 'TOP_RATED'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-900/80 text-amber-300 hover:bg-slate-800 border border-amber-500/30'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>⭐ Top Notés (4.93+)</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. SECTION 1 : CARROUSEL INFINI "SALONS D'AFFAIRES & COACHING"
             Design : Tons Or / Noir, photo coach, badge Abonnement, note
         ===================================================================== */}
      {(activeCategory === 'ALL' || activeCategory === 'BUSINESS' || activeCategory === 'LIVE_NOW' || activeCategory === 'TOP_RATED') && (
        <div className="max-w-7xl mx-auto my-4">
          <InfiniteCarouselRow<VipBusinessLounge>
            items={filteredLounges}
            title="Salons d'Affaires & Coaching VIP"
            subtitle="Cercles restreints de networking, accompagnement exécutif et masterminds d'investissement."
            badge="CLUB PRIVÉ DIRIGEANTS"
            badgeTone="gold"
            icon={<Briefcase className="w-3.5 h-3.5 text-amber-400" />}
            speed="normal"
            direction="left"
            pauseOnHover={true}
            countLabel={`${filteredLounges.length} Salons`}
            actionButton={{
              label: 'Voir la Grille',
              onClick: () => setActiveCategory('BUSINESS')
            }}
            renderItem={(lounge) => (
              <VipBusinessLoungeCard
                lounge={lounge}
                onSelect={handleLoungeClick}
                onSubscribe={(l) => {
                  setSelectedLounge(l);
                  setSelectedCourse(null);
                  setIsModalOpen(true);
                }}
              />
            )}
          />
        </div>
      )}

      {/* =====================================================================
          5. SECTION 2 : CARROUSEL INFINI "SALLES DE COURS & MASTERCLASS"
             Design : Tons Bleu Nuit / Argent, titre cours, nb élèves, badge Gratuit/Premium
         ===================================================================== */}
      {(activeCategory === 'ALL' || activeCategory === 'COURSES' || activeCategory === 'LIVE_NOW' || activeCategory === 'TOP_RATED') && (
        <div className="max-w-7xl mx-auto my-8">
          <InfiniteCarouselRow<VipCourseRoom>
            items={filteredCourses}
            title="Salles de Cours & Masterclass d'Élite"
            subtitle="Formations immersives et certifiantes animées par des experts de référence et des sommités de l'industrie."
            badge="ACADÉMIE VIRTUELLE D'ÉLITE"
            badgeTone="silver"
            icon={<GraduationCap className="w-3.5 h-3.5 text-cyan-400" />}
            speed="normal"
            direction="right"
            pauseOnHover={true}
            countLabel={`${filteredCourses.length} Salles`}
            actionButton={{
              label: 'Explorer les Cours',
              onClick: () => setActiveCategory('COURSES')
            }}
            renderItem={(course) => (
              <VipCourseRoomCard
                course={course}
                onSelect={handleCourseClick}
                onEnroll={(c) => {
                  setSelectedCourse(c);
                  setSelectedLounge(null);
                  setIsModalOpen(true);
                }}
              />
            )}
          />
        </div>
      )}

      {/* =====================================================================
          6. VUE EN GRILLE COMPLÈTE LORSQU'UN FILTRE SPÉCIFIQUE EST ACTIF OU RECHERCHE
         ===================================================================== */}
      {(searchQuery.trim().length > 0 || activeCategory !== 'ALL') && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 border-t border-slate-800/80">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span>Tous les résultats filtrés</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {totalSpaces} espaces trouvés
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Vue complète des salons et salles correspondant à vos critères
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('ALL');
              }}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>

          {totalSpaces === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800">
              <Compass className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-300">
                Aucun espace ne correspond à votre recherche
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Essayez d'autres mots-clés ou consultez l'ensemble des salons et cours VIP disponibles.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
              {filteredLounges.map((lounge) => (
                <VipBusinessLoungeCard
                  key={lounge.id}
                  lounge={lounge}
                  onSelect={handleLoungeClick}
                />
              ))}
              {filteredCourses.map((course) => (
                <VipCourseRoomCard
                  key={course.id}
                  course={course}
                  onSelect={handleCourseClick}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* =====================================================================
          7. GARANTIES ET CHARTE D'EXCELLENCE VIP
         ===================================================================== */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t border-slate-900 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Confidentialité & Secret des Affaires</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Les salons d'affaires Wameet sont régis par une charte stricte de non-divulgation. Vos échanges stratégiques restent 100% privés.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Certificats Wameet Authentifiés</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Chaque masterclass validée décerne un certificat numérique vérifiable avec identifiant unique partageable sur LinkedIn et CV.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Monétisation & Affiliation Directe</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Partagez les masterclass et salons via vos Micro-Relais Wameet pour toucher des commissions automatiques instantanées en F CFA.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-[11px] text-slate-500">
          Wameet VIP Discovery Hub • Conçu avec passion pour l'élite entrepreneuriale et éducative panafricaine.
        </div>
      </footer>

      {/* =====================================================================
          8. MODAL D'ACTION ET DÉTAIL D'ESPACE VIP
         ===================================================================== */}
      <VipRoomDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lounge={selectedLounge}
        course={selectedCourse}
        onEnterRoom={(courseToEnter) => {
          setIsModalOpen(false);
          setActiveCourseRoomForView(courseToEnter);
        }}
        onEnterLounge={(loungeToEnter) => {
          setIsModalOpen(false);
          setActiveBusinessLoungeForView(loungeToEnter);
        }}
        onSuccessAction={(msg) => {
          showToast(msg);
          setIsModalOpen(false);
        }}
      />

      {/* =====================================================================
          9. LA BARRIÈRE DE PÉAGE VIP WAMEET (PROMPT 27)
         ===================================================================== */}
      <VipPaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        lounge={selectedLounge}
        course={selectedCourse}
        userPhone={currentUserProfile?.handle ? undefined : undefined}
        userName={currentUserProfile?.name}
        onUnlockedSuccess={() => {
          showToast('👑 Félicitations ! Votre accès VIP a été validé par Wameet.');
          if (selectedCourse) {
            setTimeout(() => {
              setIsPaywallOpen(false);
              setActiveCourseRoomForView(selectedCourse);
            }, 1200);
          } else if (selectedLounge) {
            setTimeout(() => {
              setIsPaywallOpen(false);
              setActiveBusinessLoungeForView(selectedLounge);
            }, 1200);
          }
        }}
      />
    </div>
  );
};

export default VipDiscoveryScreen;
