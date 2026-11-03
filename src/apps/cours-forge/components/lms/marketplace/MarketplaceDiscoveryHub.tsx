import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Star,
  Smartphone,
  Store,
  Radio,
  PlusCircle,
  CheckCircle2,
  Filter,
  Layers,
  ArrowRight,
  BookOpen,
  Award,
  GraduationCap
} from 'lucide-react';
import { MarketplaceCourse, CourseCategory } from './types';
import { MarketplaceHeroBanner } from './MarketplaceHeroBanner';
import { MarketplaceCourseCard } from './MarketplaceCourseCard';
import { FrictionlessAfricanCheckoutBottomSheet } from './FrictionlessAfricanCheckoutBottomSheet';
import { CertificatePreviewModal } from '../CertificatePreviewModal';
import {
  subscribeToPublishedCourses,
  publishCourseToFirestore,
  SEED_MARKETPLACE_COURSES
} from '../../../../../services/marketplaceService';
import { playTapBeep } from '../../../../../utils/audio';

interface MarketplaceDiscoveryHubProps {
  onSelectCourse: (courseId: string) => void;
  onNavigateToClassroom: (courseId: string) => void;
  onBackToApp?: () => void;
}

export const MarketplaceDiscoveryHub: React.FC<MarketplaceDiscoveryHubProps> = ({
  onSelectCourse,
  onNavigateToClassroom,
  onBackToApp
}) => {
  const [courses, setCourses] = useState<MarketplaceCourse[]>(SEED_MARKETPLACE_COURSES);
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutCourse, setCheckoutCourse] = useState<MarketplaceCourse | null>(null);
  const [isPublishingNew, setIsPublishingNew] = useState(false);
  const [publishToast, setPublishToast] = useState<string | null>(null);
  const [isCertificatePreviewOpen, setIsCertificatePreviewOpen] = useState(false);

  // 1. ÉCOUTEUR FIRESTORE TEMPS RÉEL (The 'One-Click Publish' Firebase Listener)
  useEffect(() => {
    const unsubscribe = subscribeToPublishedCourses((liveCourses) => {
      setCourses(liveCourses);
    });

    const handleCustomUpdate = (e: any) => {
      if (e.detail) setCourses(e.detail);
    };
    window.addEventListener('nana_courses_updated', handleCustomUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('nana_courses_updated', handleCustomUpdate);
    };
  }, []);

  // Démo : Publication 1-Clic d'un nouveau cours sans recharger la page
  const handleTestOneClickPublish = async () => {
    setIsPublishingNew(true);
    playTapBeep();

    const newDemoCourse: Partial<MarketplaceCourse> = {
      title: `Masterclass IA & Automatisation Caisse #${Math.floor(Math.random() * 900 + 100)}`,
      tagline: 'Connectez vos terminaux POS à des agents conversationnels WhatsApp pour automatiser vos commandes.',
      category: 'Fintech & Mobile Money',
      price: 40000,
      discountPrice: 40000,
      originalPrice: 60000,
      currency: 'FCFA',
      rating: 5.0,
      enrolledCount: 1,
      badge: 'Nouveau',
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      trailerVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    };

    await publishCourseToFirestore(newDemoCourse);
    setIsPublishingNew(false);
    setPublishToast('Nouveau cours publié avec succès en direct via Firestore Listener !');
    setTimeout(() => setPublishToast(null), 4000);
  };

  // Filtrage des cours
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchTagline = (c.tagline || '').toLowerCase().includes(q);
        const matchInstructor = (c.instructor.name || '').toLowerCase().includes(q);
        if (!matchTitle && !matchTagline && !matchInstructor) return false;
      }

      if (selectedCategory === 'FINTECH_MOBILE_MONEY' && !c.category.includes('Fintech')) return false;
      if ((selectedCategory === 'POS_COMMERCE' || (selectedCategory as string) === 'TELECOM_POS') && !c.category.includes('POS') && !c.category.includes('Magasin') && !c.category.includes('Caisse')) return false;
      if (selectedCategory === 'LIVE_SHOPPING' && !c.category.includes('Live')) return false;
      if (selectedCategory === 'CYBERSECURITY_AUDIT' && !c.category.includes('Sécurité')) return false;

      return true;
    });
  }, [courses, searchQuery, selectedCategory]);

  // Cours vedette
  const featuredCourse = useMemo(() => {
    return courses.find((c) => c.isFeatured) || courses[0];
  }, [courses]);

  // Catégorisations pour les rangées Netflix
  const topRatedCourses = useMemo(() => {
    return [...courses].sort((a, b) => b.rating - a.rating);
  }, [courses]);

  const trendingCourses = useMemo(() => {
    return [...courses].sort((a, b) => b.enrolledCount - a.enrolledCount);
  }, [courses]);

  const fintechCourses = useMemo(() => {
    return courses.filter((c) => c.category.includes('Fintech') || c.category.includes('Mobile'));
  }, [courses]);

  const posCourses = useMemo(() => {
    return courses.filter((c) => c.category.includes('POS') || c.category.includes('Magasin') || c.category.includes('Caisse'));
  }, [courses]);

  // Composant interne pour une rangée carrousel Netflix avec boutons de défilement
  const CarouselRow = ({
    title,
    icon: Icon,
    badge,
    courseList
  }: {
    title: string;
    icon: React.ElementType;
    badge?: string;
    courseList: MarketplaceCourse[];
  }) => {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    const scroll = (direction: 'left' | 'right') => {
      playTapBeep();
      if (scrollContainerRef.current) {
        const { scrollLeft, clientWidth } = scrollContainerRef.current;
        const scrollAmount = clientWidth * 0.75;
        scrollContainerRef.current.scrollTo({
          left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
          behavior: 'smooth'
        });
      }
    };

    if (courseList.length === 0) return null;

    return (
      <div className="space-y-3 relative group">
        {/* En-tête de la rangée */}
        <div className="flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400">
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
              {title}
            </h3>
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition duration-200">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="p-2 sm:p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95 touch-manipulation shadow-md"
              title="Défiler à gauche"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="p-2 sm:p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95 touch-manipulation shadow-md"
              title="Défiler à droite"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conteneur Défilable Horizontalement & Fluide en Tactile */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto px-4 sm:px-8 pb-4 pt-1 no-scrollbar scroll-smooth overscroll-x-contain"
          style={{
            scrollSnapType: 'x proximity',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x pan-y'
          }}
        >
          {courseList.map((c) => (
            <div key={c.id} style={{ scrollSnapAlign: 'start' }}>
              <MarketplaceCourseCard
                course={c}
                onSelectCourse={onSelectCourse}
                onQuickEnroll={(selected) => setCheckoutCourse(selected)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div 
      id="marketplace-discovery-hub"
      className="w-full min-h-screen h-screen flex-1 bg-[#030712] text-slate-100 font-sans select-none overflow-y-auto overscroll-y-contain scroll-smooth pb-44"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      
      {/* 1. Barre de Navigation Supérieure Publique */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-500/25">
            N
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-white tracking-wide">
                NaNa Academy
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400">
              Formations &amp; Masterclasses
            </p>
          </div>
        </div>

        {/* Barre de Recherche & Boutons d'Action */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-40 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher masterclass..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none min-h-[38px]"
            />
          </div>

          {/* Bouton Accès Direct au Campus Privé Étudiant */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/campus');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/40 hover:to-indigo-600/40 text-purple-200 font-bold text-xs border border-purple-500/40 transition flex items-center gap-1.5 cursor-pointer shadow-sm min-h-[38px] active:scale-95"
            title="Accéder directement à votre Espace Étudiant & Campus Virtuel Privé"
          >
            <GraduationCap className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden sm:inline">Mon Campus Privé</span>
            <span className="sm:hidden">Campus</span>
          </button>

          {/* Bouton Tester / Consulter le Certificat Officiel */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/certificat');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 transition flex items-center gap-1.5 cursor-pointer shadow-sm min-h-[38px] active:scale-95"
            title="Consulter le Certificat Officiel avec QR Code & Téléchargement"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Certificat Officiel</span>
            <span className="sm:hidden">Certificat</span>
          </button>

          {/* Bouton Test Publication 1-Clic */}
          <button
            type="button"
            disabled={isPublishingNew}
            onClick={handleTestOneClickPublish}
            className="hidden sm:flex px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 font-bold text-xs border border-emerald-500/30 transition items-center gap-1.5 cursor-pointer min-h-[38px]"
            title="Tester l'écouteur live Firestore en publiant un cours instantanément"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isPublishingNew ? 'Publication...' : '+ Publier 1-Clic'}</span>
          </button>

          {onBackToApp && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onBackToApp();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              Hub Central
            </button>
          )}
        </div>
      </header>

      {/* Toast de Notification Réactif */}
      {publishToast && (
        <div className="fixed top-16 right-6 z-50 px-4 py-2 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-2xl flex items-center gap-2 animate-slideDown">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{publishToast}</span>
        </div>
      )}

      {/* 2. Hero Banner Cinématographique (Featured Course) */}
      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        {featuredCourse && (
          <MarketplaceHeroBanner
            course={featuredCourse}
            onSelectCourse={onSelectCourse}
            onDirectEnroll={(course) => setCheckoutCourse(course)}
          />
        )}
      </div>

      {/* 3. Sélecteur de Filtres par Catégorie */}
      <div className="px-4 sm:px-8 max-w-7xl mx-auto py-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {[
            { id: 'ALL', label: 'Toutes les Masterclasses' },
            { id: 'FINTECH_MOBILE_MONEY', label: 'Fintech & Mobile Money' },
            { id: 'POS_COMMERCE', label: 'Systèmes POS & Gestion' },
            { id: 'LIVE_SHOPPING', label: 'Live Shopping & Vente' },
            { id: 'CYBERSECURITY_AUDIT', label: 'Sécurité & Audit' }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as CourseCategory)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Rangées de Carrousels Horizontaux Netflix */}
      <div className="space-y-8 pt-4">
        {/* Rangée 1 : Tendances du Moment */}
        <CarouselRow
          title="Tendances & Formations Populaires"
          icon={TrendingUp}
          badge="TOP FORMATIONS"
          courseList={trendingCourses}
        />

        {/* Rangée 2 : Les Mieux Notées */}
        <CarouselRow
          title="Les Mieux Notées par les Entrepreneurs"
          icon={Star}
          badge="4.9+ ★"
          courseList={topRatedCourses}
        />

        {/* Rangée 3 : Fintech & Mobile Money */}
        <CarouselRow
          title="Fintech, Passerelles USSD & Monétique"
          icon={Smartphone}
          courseList={fintechCourses}
        />

        {/* Rangée 4 : Caisses Connectées & Mode Déconnecté */}
        <CarouselRow
          title="Caisses Connectées POS & Synchronisation"
          icon={Store}
          courseList={posCourses}
        />
      </div>

      {/* 5. Tiroir de Paiement Mobile Money Instantané */}
      {checkoutCourse && (
        <FrictionlessAfricanCheckoutBottomSheet
          course={checkoutCourse}
          isOpen={Boolean(checkoutCourse)}
          onClose={() => setCheckoutCourse(null)}
          onEnrollSuccess={(courseId) => {
            setCheckoutCourse(null);
            onNavigateToClassroom(courseId);
          }}
        />
      )}

      {/* 6. Modale de Test & Prévisualisation du Certificat Officiel */}
      <CertificatePreviewModal
        isOpen={isCertificatePreviewOpen}
        onClose={() => setIsCertificatePreviewOpen(false)}
      />
    </div>
  );
};

export default MarketplaceDiscoveryHub;
