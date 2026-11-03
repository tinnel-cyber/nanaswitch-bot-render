import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Play, Check, Star, Users, Clock, Award, ShieldCheck, Lock, 
  ChevronDown, ChevronUp, ArrowRight, Share2, BookOpen, 
  Sparkles, GraduationCap, PhoneCall, Smartphone, Store, ArrowLeft, CheckCircle2,
  FileText, HelpCircle, Laptop, Globe
} from 'lucide-react';
import { Course, StoreUser } from '../../../../types';
import { getMockCourseById } from './mockCourses';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface CourseLandingPageViewProps {
  courseId: string;
  currentUser?: StoreUser | null;
  onEnroll?: (courseId: string) => void;
  onNavigateToClassroom?: (courseId: string) => void;
  onBackToStore?: () => void;
  className?: string;
}

export const CourseLandingPageView: React.FC<CourseLandingPageViewProps> = ({
  courseId,
  currentUser,
  onEnroll,
  onNavigateToClassroom,
  onBackToStore,
  className = ''
}) => {
  const [course, setCourse] = useState<Course>(() => getMockCourseById(courseId));
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    'mod-1': true,
    'mod-2': false,
    'mod-3': false
  });
  const [isPlayingTeaser, setIsPlayingTeaser] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Vérifier si l'étudiant est déjà inscrit localement
  useEffect(() => {
    const saved = localStorage.getItem(`nana_course_enrolled_${courseId}`);
    if (saved === 'true') {
      setIsEnrolled(true);
    }
  }, [courseId]);

  const toggleModule = (moduleId: string) => {
    playTapBeep();
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleEnrollClick = () => {
    playValidationBeep();
    localStorage.setItem(`nana_course_enrolled_${courseId}`, 'true');
    setIsEnrolled(true);

    if (onEnroll) {
      onEnroll(courseId);
    }
    if (onNavigateToClassroom) {
      onNavigateToClassroom(courseId);
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/classroom/${courseId}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleCopyShare = async () => {
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

  // Calcul du nombre total de leçons
  const totalLessons = useMemo(() => {
    return course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  }, [course]);

  return (
    <div className={`min-h-screen w-full bg-[#070b14] text-slate-100 flex flex-col font-sans select-none overflow-y-auto ${className}`}>
      {/* 1. Header Public Épuré & Navigation */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onBackToStore && (
            <button
              type="button"
              onClick={() => { playTapBeep(); onBackToStore(); }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold min-h-[40px]"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Boutique</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs font-black text-white">
            <Store className="w-4 h-4 text-indigo-400" />
            <span>ENTREPRISE KONKOBO POUSBILA • ACADÉMIE</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEnrolled ? (
            <button
              type="button"
              onClick={() => onNavigateToClassroom ? onNavigateToClassroom(courseId) : null}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md min-h-[40px]"
            >
              <Laptop className="w-4 h-4" />
              <span>Entrer en Classe</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnrollClick}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 active:scale-95 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md min-h-[40px]"
            >
              <span>S'inscrire ({formatCFA(course.price)})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyShare}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition border border-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Partager le cours"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      </header>

      {/* 2. Hero Section Haute Conversion */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-[#0a0f1d] to-[#070b14] border-b border-slate-800/80 px-4 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Colonne Gauche : Pitch, Titre, Preuve Sociale & CTA */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-black">
                {course.category}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Certificat Inclus
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              {course.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              {course.tagline}
            </p>

            {/* Preuves Sociales */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-semibold pt-1">
              <div className="flex items-center gap-1 text-amber-400 font-black">
                <Star className="w-4 h-4 fill-current" />
                <span>{course.rating} / 5</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>{course.enrolledCount}+ entrepreneurs formés</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>{Math.round(course.totalDurationMinutes / 60)}h de formation intensive</span>
              </div>
            </div>

            {/* Carte Formateur Simplifiée dans Hero */}
            <div className="flex items-center gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
              <img 
                src={course.instructor.avatarUrl} 
                alt={course.instructor.name} 
                className="w-12 h-12 rounded-xl object-cover border border-indigo-500/40 shrink-0" 
              />
              <div className="min-w-0">
                <p className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>{course.instructor.name}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </p>
                <p className="text-[11px] text-slate-400 truncate">{course.instructor.title}</p>
              </div>
            </div>

            {/* CTA Principal d'Inscription */}
            <div className="pt-2 space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {formatCFA(course.price)}
                </span>
                <span className="text-xs text-slate-500 line-through">75 000 FCFA</span>
                <span className="text-xs font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                  -40% Réduction UEMOA
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {isEnrolled ? (
                  <button
                    type="button"
                    onClick={() => onNavigateToClassroom ? onNavigateToClassroom(courseId) : null}
                    className="flex-1 py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 transition cursor-pointer min-h-[48px]"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Accéder Immédiatement au Campus Virtuel</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnrollClick}
                    className="flex-1 py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 active:scale-95 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 transition cursor-pointer min-h-[48px]"
                  >
                    <GraduationCap className="w-5 h-5 text-emerald-300" />
                    <span>S'inscrire & Débloquer la Formation</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Paiement Mobile Money (Orange / Moov / Wave)
                </span>
                <span>•</span>
                <span>Accès à vie 24/7</span>
              </div>
            </div>
          </div>

          {/* Colonne Droite : Teaser Vidéo Interactif */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl aspect-video">
              {isPlayingTeaser ? (
                <iframe
                  src={course.teaserVideoUrl}
                  title={course.title}
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                />
              ) : (
                <div 
                  className="w-full h-full relative cursor-pointer group flex items-center justify-center"
                  onClick={() => { playTapBeep(); setIsPlayingTeaser(true); }}
                >
                  <img 
                    src={course.coverImage} 
                    alt={course.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-60" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                  {/* Bouton Play Flottant */}
                  <div className="relative z-10 w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xl shadow-rose-950/80 group-hover:scale-110 active:scale-95 transition">
                    <Play className="w-7 h-7 fill-current ml-1" />
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-center">
                    <span className="text-xs font-black text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700">
                      Regarder la présentation vidéo (3 min)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Corps de Page : Acquis, Syllabus Sticky, Formateur & Avis */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-10">
        {/* Acquis d'Apprentissage (Ce que vous allez maîtriser) */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Compétences Validées à l'Issue de la Formation</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {course.learningOutcomes.map((outcome, idx) => (
              <div key={idx} className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">{outcome}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Sticky Course Syllabus (Plan Détaillé des Modules) */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>Programme Académique & Syllabus du Cours</span>
              </h2>
              <p className="text-xs text-slate-400">
                {course.modules.length} modules • {totalLessons} leçons • Accès illimité
              </p>
            </div>

            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              Progression Linéaire
            </span>
          </div>

          {/* Accordéon des Modules */}
          <div className="space-y-3">
            {course.modules.map((module, mIdx) => {
              const isExpanded = !!expandedModules[module.id];

              return (
                <div 
                  key={module.id} 
                  className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden transition"
                >
                  {/* Entête du Module */}
                  <div
                    onClick={() => toggleModule(module.id)}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition select-none"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400">
                          Module {mIdx + 1}
                        </span>
                        <span className="text-xs text-slate-500">• {module.lessons.length} leçons</span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white">{module.title}</h3>
                    </div>

                    <button
                      type="button"
                      className="p-1.5 rounded-xl bg-slate-800 text-slate-400"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Liste des Leçons dans le Module */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 divide-y divide-slate-800/50 bg-slate-950/50">
                      {module.lessons.map((lesson) => (
                        <div 
                          key={lesson.id} 
                          className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-900/40 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              lesson.quiz 
                                ? 'bg-amber-500/20 text-amber-400' 
                                : lesson.assignment 
                                  ? 'bg-rose-500/20 text-rose-400' 
                                  : 'bg-indigo-500/20 text-indigo-400'
                            }`}>
                              {lesson.quiz ? <HelpCircle className="w-4 h-4" /> : lesson.assignment ? <FileText className="w-4 h-4" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate">{lesson.title}</p>
                              <div className="flex items-center gap-2 text-[10.5px] text-slate-500">
                                <span>{lesson.durationMinutes} min</span>
                                {lesson.resources && lesson.resources.length > 0 && (
                                  <span>• {lesson.resources.length} document(s)</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {lesson.isFreePreview ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                                Aperçu Gratuit
                              </span>
                            ) : isEnrolled ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                                Débloqué
                              </span>
                            ) : (
                              <span className="p-1.5 rounded-xl bg-slate-800 text-slate-500" title="Verrouillé - Inscription requise">
                                <Lock className="w-3.5 h-3.5" />
                              </span>
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
        </section>

        {/* Section Profil de l'Instructeur */}
        <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Formateur Référent de la Masterclass</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <img 
              src={course.instructor.avatarUrl} 
              alt={course.instructor.name} 
              className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-xl shrink-0" 
            />
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>{course.instructor.name}</span>
                <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Formateur Agréé
                </span>
              </h3>
              <p className="text-xs font-bold text-indigo-300">{course.instructor.title}</p>
              <p className="text-xs text-slate-300 leading-relaxed">{course.instructor.bio}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800">
            {course.instructor.credentials.map((cred, idx) => (
              <div key={idx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{cred}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Témoignages des Anciens Étudiants */}
        <section className="space-y-4">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-current" />
            <span>Avis Vérifiés des Entrepreneurs Certifiés</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {course.testimonials.map((test) => (
              <div key={test.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(test.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-300 italic leading-relaxed">
                    "{test.comment}"
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800">
                  <img src={test.avatarUrl} alt={test.studentName} className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <p className="text-xs font-bold text-white">{test.studentName}</p>
                    <p className="text-[10px] text-slate-500">{test.studentRole}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bannière Sticky d'Inscription Mobile & Desktop */}
        <div className="sticky bottom-4 z-30 p-4 rounded-3xl bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400">Rejoignez la promotion en cours</p>
            <p className="text-base font-black text-white">{formatCFA(course.price)} • Accès Immédiat</p>
          </div>

          {isEnrolled ? (
            <button
              type="button"
              onClick={() => onNavigateToClassroom ? onNavigateToClassroom(courseId) : null}
              className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer min-h-[44px]"
            >
              <Laptop className="w-4 h-4" />
              <span>Accéder à ma Salle de Classe</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnrollClick}
              className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition cursor-pointer min-h-[44px]"
            >
              <GraduationCap className="w-4 h-4 text-emerald-300" />
              <span>S'inscrire Maintenant (Mobile Money & Carte)</span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default CourseLandingPageView;
