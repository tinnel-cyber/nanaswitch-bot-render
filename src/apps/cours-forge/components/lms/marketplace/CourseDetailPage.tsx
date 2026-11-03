import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Lock,
  Check,
  Star,
  Users,
  Clock,
  Award,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Share2,
  Sparkles,
  GraduationCap,
  BookOpen,
  ArrowRight,
  Maximize2,
  CheckCircle2,
  Smartphone,
  MessageSquare,
  Bot,
  Target
} from 'lucide-react';
import { MarketplaceCourse } from './types';
import { CourseLesson, CourseModule } from '../../../../../types';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../../utils/audio';
import { FrictionlessAfricanCheckoutBottomSheet } from './FrictionlessAfricanCheckoutBottomSheet';
import { AccessController } from './AccessController';

const CourseDiagnosisQuizModal = React.lazy(() => import('./CourseDiagnosisQuizModal'));
const TinnelaAiTutorModal = React.lazy(() => import('./TinnelaAiTutorModal'));

interface CourseDetailPageProps {
  course: MarketplaceCourse;
  onBackToDiscovery: () => void;
  onNavigateToClassroom: (courseId: string) => void;
}

export const CourseDetailPage: React.FC<CourseDetailPageProps> = ({
  course,
  onBackToDiscovery,
  onNavigateToClassroom
}) => {
  const [activeVideoUrl, setActiveVideoUrl] = useState(
    course.trailerVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  );
  const [activeVideoTitle, setActiveVideoTitle] = useState('Bande-Annonce Officielle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isStickyPip, setIsStickyPip] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    'mod-1': true,
    'mod-2': false,
    'mod-3': false
  });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<number | undefined>(undefined);
  const [discountLabel, setDiscountLabel] = useState<string | undefined>(undefined);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const heroVideoWrapperRef = useRef<HTMLDivElement | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  // Vérifier si l'étudiant est déjà inscrit
  useEffect(() => {
    const saved = localStorage.getItem(`nana_course_enrolled_${course.id}`);
    if (saved === 'true') {
      setIsEnrolled(true);
    }
  }, [course.id]);

  // Détection du scroll pour la transition en Sticky Picture-in-Picture (PiP)
  useEffect(() => {
    const handleScroll = () => {
      if (!heroVideoWrapperRef.current) return;
      const rect = heroVideoWrapperRef.current.getBoundingClientRect();
      // Si le lecteur principal sort de l'écran par le haut
      if (rect.bottom < 80) {
        setIsStickyPip(true);
      } else {
        setIsStickyPip(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleModule = (modId: string) => {
    playTapBeep();
    setExpandedModules((prev) => ({
      ...prev,
      [modId]: !prev[modId]
    }));
  };

  // Clic sur une leçon en Aperçu Gratuit (Free Preview)
  const handlePlayFreePreview = (lesson: CourseLesson) => {
    playTapBeep();
    if (lesson.videoUrl) {
      setActiveVideoUrl(lesson.videoUrl);
      setActiveVideoTitle(`Aperçu Gratuit : ${lesson.title}`);
      setIsPlaying(true);
      if (videoPlayerRef.current) {
        videoPlayerRef.current.currentTime = 0;
        videoPlayerRef.current.play().catch(() => {});
      }
      // Revenir en haut si l'utilisateur est trop bas
      if (isStickyPip) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleShare = async () => {
    playTapBeep();
    const url = typeof window !== 'undefined' ? window.location.href : 'https://nanasore.com';
    if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
      try {
        await (navigator as any).share({
          title: course.title || 'Nanasore Formation',
          url: url,
        });
        return;
      } catch (err) {}
    }
    if (typeof window !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const basePrice = course.discountPrice || course.price;
  const effectivePrice = appliedDiscount && appliedDiscount > 0
    ? Math.round(basePrice * (1 - appliedDiscount / 100))
    : basePrice;

  return (
    <div 
      id="course-detail-page-container"
      className="w-full h-full min-h-0 flex-1 bg-[#050811] text-slate-100 flex flex-col font-sans select-none overflow-y-auto overscroll-y-contain scroll-smooth pb-32 sm:pb-20"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      
      {/* 1. Header Public Épuré */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onBackToDiscovery();
            }}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold border border-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Catalogue</span>
          </button>

          <span className="text-xs font-black text-white truncate max-w-[200px] sm:max-w-md hidden sm:inline">
            {course.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">{copiedLink ? 'Lien copié ✓' : 'Partager'}</span>
          </button>

          {!isEnrolled ? (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsCheckoutOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-slate-950" />
              <span>S&apos;inscrire ({formatCFA(effectivePrice)})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateToClassroom(course.id)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Accéder au Campus</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* 2. Hero Section & Lecteur Vidéo Principal */}
      <section className="relative w-full max-w-6xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Wrapper Vidéo Principal avec détection pour le Sticky PiP */}
        <div ref={heroVideoWrapperRef} className="relative aspect-video w-full rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
          <video
            ref={videoPlayerRef}
            src={activeVideoUrl}
            controls
            playsInline
            className="w-full h-full object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Bandeau d'état vidéo */}
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white flex items-center gap-2 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{activeVideoTitle}</span>
          </div>
        </div>

        {/* Informations Principales du Cours */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
          
          {/* Colonne Gauche : Titre, Présentation & Syllabus */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {course.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {course.level}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Accès à vie
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-black text-white leading-tight">
                {course.title}
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed">
                {course.description}
              </p>
            </div>

            {/* Ce que vous allez apprendre */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Objectifs Pédagogiques &amp; Compétences Clés</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {course.learningOutcomes?.map((outcome, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                      ✓
                    </span>
                    <span>{outcome}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SYLLABUS DYNAMIQUE AVEC ACCORDÉONS & CONTRÔLE D'ACCÈS ZERO-TRUST */}
            <AccessController
              courseId={course.id}
              courseTitle={course.title}
              onNavigateToClassroom={onNavigateToClassroom}
            >
              {({ isEnrolled: isOfficiallyEnrolled, renderLessonActionButton }) => (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-400" />
                      <span>Syllabus de la Formation ({course.modules.length} Modules)</span>
                    </h3>
                    <span className="text-xs text-slate-400">
                      {isOfficiallyEnrolled
                        ? 'Accès illimité actif : Toutes les leçons sont débloquées'
                        : 'Cliquez sur un aperçu gratuit pour le visionner'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {course.modules.map((mod: CourseModule) => {
                      const isExpanded = expandedModules[mod.id] || false;
                      return (
                        <div
                          key={mod.id}
                          className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden transition-all duration-200"
                        >
                          {/* En-tête de module */}
                          <button
                            type="button"
                            onClick={() => toggleModule(mod.id)}
                            className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-800/50 transition cursor-pointer"
                          >
                            <div className="space-y-1">
                              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                                <span>{mod.title}</span>
                              </h4>
                              <p className="text-[11px] text-slate-400">{mod.description}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 font-semibold">
                                {mod.lessons.length} leçons
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </button>

                          {/* Liste des leçons */}
                          {isExpanded && (
                            <div className="border-t border-slate-800/80 divide-y divide-slate-800/40 bg-slate-950/40">
                              {mod.lessons.map((lesson: CourseLesson) => (
                                <div
                                  key={lesson.id}
                                  className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-900/40 transition gap-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="space-y-0.5">
                                      <div className="text-xs font-semibold text-slate-200">
                                        {lesson.title}
                                      </div>
                                      <div className="text-[10.5px] text-slate-500 flex items-center gap-2">
                                        <span>{lesson.durationMinutes} min</span>
                                        {lesson.assignment && (
                                          <span className="text-amber-400 font-bold">• Cas Pratique</span>
                                        )}
                                        {lesson.quiz && (
                                          <span className="text-indigo-400 font-bold">• Quiz Adaptatif</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    {renderLessonActionButton(
                                      lesson.id,
                                      lesson.isFreePreview || false,
                                      () => handlePlayFreePreview(lesson)
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </AccessController>

            {/* Témoignages & Avis Vérifiés */}
            {course.testimonials && course.testimonials.length > 0 && (
              <div className="space-y-4 pt-4">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span>Retours d&apos;Expérience des Entrepreneurs UEMOA</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.testimonials.map((test) => (
                    <div
                      key={test.id}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={test.avatarUrl}
                            alt={test.studentName}
                            className="w-9 h-9 rounded-full object-cover border border-amber-500/40"
                          />
                          <div>
                            <div className="text-xs font-bold text-white">{test.studentName}</div>
                            <div className="text-[10px] text-slate-400">{test.studentRole}</div>
                          </div>
                        </div>

                        <div className="flex text-amber-400">
                          {[...Array(test.rating)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 italic leading-relaxed">
                        &laquo; {test.comment} &raquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colonne Droite : Carte Formateur & Panier Réassurance */}
          <div className="space-y-6">
            {/* Carte Achat Desktop */}
            <div className="sticky top-20 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 shadow-2xl space-y-5">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Tarif Spécial UEMOA
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">
                    {formatCFA(effectivePrice)}
                  </span>
                  {(appliedDiscount || course.originalPrice) && (
                    <span className="text-sm text-slate-500 line-through">
                      {formatCFA(appliedDiscount ? basePrice : course.originalPrice!)}
                    </span>
                  )}
                </div>
                {appliedDiscount ? (
                  <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Remise diagnostic -{appliedDiscount}% appliquée !</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-rose-400 font-bold">
                    Offre promotionnelle limitée
                  </div>
                )}
              </div>

              {/* Bouton Inscription Principale */}
              {!isEnrolled ? (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <GraduationCap className="w-5 h-5 text-slate-950" />
                    <span>S&apos;inscrire en 1-Clic Mobile Money</span>
                  </button>

                  {/* Micro-Quiz 60-Secondes Conversion Hook */}
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setIsQuizOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-emerald-200 font-black text-xs transition flex items-center justify-center gap-2 group cursor-pointer shadow-lg shadow-emerald-950/20"
                  >
                    <Target className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>🎯 Ai-je besoin de ce cours ? (Test Express)</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateToClassroom(course.id)}
                  className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Accéder à votre Salle de Cours</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {/* Avantages Inclus */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Accès complet et illimité 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Certificat Professionnel Délivré</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Optimisé Android &amp; Connexions 3G/4G</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  <span>Garantie Satisfait ou Remboursé 14 jours</span>
                </div>
              </div>

              {/* Carte Formateur Ibrahim Pousbila Konkobo */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Formateur Principal
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={course.instructor.avatarUrl}
                    alt={course.instructor.name}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500/50 shadow-md"
                  />
                  <div>
                    <h5 className="text-xs font-black text-white flex items-center gap-1">
                      <span>{course.instructor.name}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </h5>
                    <p className="text-[10px] text-slate-400 line-clamp-2">
                      {course.instructor.title}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {course.instructor.bio}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. LECTEUR FLOTTANT PICTURE-IN-PICTURE (STICKY PiP) AU SCROLL */}
      <AnimatePresence>
        {isStickyPip && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 w-72 sm:w-80 rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/80 shadow-2xl flex flex-col"
          >
            <div className="relative aspect-video w-full bg-black">
              <video
                src={activeVideoUrl}
                autoPlay
                muted={isMuted}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="absolute top-2 right-2 p-1 rounded-lg bg-black/70 hover:bg-black text-white text-[10px] flex items-center gap-1"
                title="Agrandir en haut"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>

            <div className="p-2.5 bg-slate-900 flex items-center justify-between">
              <div className="truncate max-w-[170px] text-[11px] font-bold text-white">
                {activeVideoTitle}
              </div>
              <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black">
                PiP Live
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. BARRE CTA MOBILE FIXE (FRICTIONLESS CHECKOUT BAR) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 flex sm:hidden items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold">Prix Total</span>
          <div className="text-base font-black text-white flex items-center gap-1.5">
            {appliedDiscount ? (
              <>
                <span className="text-xs text-slate-500 line-through">{formatCFA(basePrice)}</span>
                <span className="text-emerald-400">{formatCFA(effectivePrice)}</span>
              </>
            ) : (
              <span>{formatCFA(effectivePrice)}</span>
            )}
          </div>
        </div>

        {!isEnrolled ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsQuizOpen(true);
              }}
              className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
              title="Ai-je besoin de ce cours ? (Test Express)"
            >
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-black">Test 60s</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsCheckoutOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-slate-950" />
              <span>S&apos;inscrire</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onNavigateToClassroom(course.id)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center gap-1 cursor-pointer"
          >
            <span>Campus</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 5. TIROIR COULISSANT DE PAIEMENT AFRICAIN 1-CLIC */}
      <FrictionlessAfricanCheckoutBottomSheet
        course={course}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        discountPercentage={appliedDiscount}
        discountLabel={discountLabel}
        onEnrollSuccess={(courseId) => {
          setIsEnrolled(true);
          onNavigateToClassroom(courseId);
        }}
      />

      {/* 6. BOUTON FLOTTANT TINNELA AI TUTOR */}
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          playTapBeep();
          setIsTutorOpen(true);
        }}
        className="fixed bottom-20 sm:bottom-6 left-4 sm:left-6 z-40 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-slate-900/90 text-white font-bold text-xs sm:text-sm border border-indigo-500/50 shadow-2xl shadow-indigo-950/80 hover:border-indigo-400 transition-all flex items-center gap-2 group cursor-pointer backdrop-blur-md ring-2 ring-indigo-500/20"
      >
        <div className="relative">
          <div className="w-6 h-6 rounded-full bg-indigo-600/30 flex items-center justify-center border border-indigo-400/50 group-hover:bg-indigo-600/50 transition-colors">
            <Bot className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
        </div>
        <span className="bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent font-black">
          🤖 Une question sur le cours ?
        </span>
      </motion.button>

      {/* 7. MODALES DU MOTEUR DE CONVERSION AUTOMATISÉ (QUIZ DIAGNOSTIC & TINNELA AI TUTOR) */}
      <React.Suspense fallback={null}>
        {isQuizOpen && (
          <CourseDiagnosisQuizModal
            course={course}
            isOpen={isQuizOpen}
            onClose={() => setIsQuizOpen(false)}
            onClaimDiscount={(discount) => {
              setAppliedDiscount(discount);
              setDiscountLabel(`Remise Flash Diagnostic (-${discount}%)`);
              setIsQuizOpen(false);
              setIsCheckoutOpen(true);
            }}
          />
        )}
      </React.Suspense>

      <React.Suspense fallback={null}>
        {isTutorOpen && (
          <TinnelaAiTutorModal
            course={course}
            isOpen={isTutorOpen}
            onClose={() => setIsTutorOpen(false)}
            onEnrollClick={() => {
              setIsTutorOpen(false);
              setIsCheckoutOpen(true);
            }}
          />
        )}
      </React.Suspense>
    </div>
  );
};

export default CourseDetailPage;
