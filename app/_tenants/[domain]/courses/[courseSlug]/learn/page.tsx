import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantByIdentifier, getTenantCourseBySlug } from '@/lib/tenants';
import { getAffiliateUrl } from '@/lib/affiliate';

interface LearnCoursePageProps {
  params: Promise<{ domain: string; courseSlug: string }>;
  searchParams?: Promise<{ lesson?: string }>;
}

export default async function LearnCoursePage({ params, searchParams }: LearnCoursePageProps) {
  const { domain, courseSlug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const decodedDomain = decodeURIComponent(domain);
  const tenant = await getTenantByIdentifier(decodedDomain, true);

  if (!tenant) {
    return notFound();
  }

  const result = await getTenantCourseBySlug(tenant.id, courseSlug);
  if (!result || !result.course) {
    return notFound();
  }

  const { course, lessons } = result;
  const primaryColor = tenant.primary_color || '#3b82f6';

  // Leçon active par défaut (première leçon ou paramètre d'URL)
  const activeLessonIndex = sParams.lesson
    ? Math.max(0, lessons.findIndex((l) => l.id === sParams.lesson))
    : 0;
  const activeLesson = lessons[activeLessonIndex] || lessons[0];

  return (
    <div className="space-y-6">
      {/* Barre supérieure de navigation du cours */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href={`/courses/${course.slug}`}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            ← Présentation du cours
          </Link>
          <span className="text-slate-600">|</span>
          <h1 className="text-lg font-bold text-white truncate max-w-lg">
            {course.title}
          </h1>
        </div>

        <div className="text-xs text-slate-400">
          Module {activeLessonIndex + 1} sur {lessons.length || 1}
        </div>
      </div>

      {/* Lecteur Vidéo & Curriculum */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Colonne Lecteur & Contenu */}
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video w-full rounded-2xl bg-black border border-slate-800 overflow-hidden relative shadow-2xl">
            {activeLesson?.video_url ? (
              <iframe
                src={activeLesson.video_url}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={activeLesson.title}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl">
                  🎬
                </div>
                <h3 className="font-semibold text-white text-base">
                  {activeLesson?.title || 'Aucune vidéo disponible pour ce module'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md">
                  Le contenu textuel et les ressources associées sont disponibles ci-dessous.
                </p>
              </div>
            )}
          </div>

          {/* Fiche de la leçon active */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {activeLesson?.title || 'Module de formation'}
              </h2>
              {activeLesson?.is_free_preview && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                  Aperçu public
                </span>
              )}
            </div>

            <div className="prose prose-invert max-w-none text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {activeLesson?.content || (
                'Ce cours interactif vous guide pas à pas dans l’apprentissage des concepts clés. Suivez attentivement les consignes de l’instructeur.'
              )}
            </div>
          </div>
        </div>

        {/* Playlist / Sommaire des Leçons */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm">Programme des Modules</h3>
            <span className="text-xs text-slate-500">{lessons.length} leçons</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {lessons.map((lesson, idx) => {
              const isSelected = activeLesson?.id === lesson.id;
              return (
                <Link
                  key={lesson.id}
                  href={`/courses/${course.slug}/learn?lesson=${lesson.id}`}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'bg-slate-800 border-slate-600 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      isSelected ? 'text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                    style={isSelected ? { backgroundColor: primaryColor } : {}}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {lesson.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {lesson.video_url ? 'Vidéo HD' : 'Texte & Ressources'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
        Espace d'apprentissage sécurisé •{' '}
        <a
          href={getAffiliateUrl(tenant.slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-white transition-colors underline decoration-slate-600 underline-offset-2"
        >
          Propulsé par <strong className="font-semibold text-slate-300">Nanasore</strong>
        </a>
      </div>
    </div>
  );
}
