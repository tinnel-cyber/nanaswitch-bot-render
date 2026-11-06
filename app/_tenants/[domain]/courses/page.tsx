import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantByIdentifier, getTenantCourses } from '@/lib/tenants';

interface TenantCoursesPageProps {
  params: Promise<{ domain: string }>;
}

export default async function TenantCoursesPage({ params }: TenantCoursesPageProps) {
  const { domain } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const tenant = await getTenantByIdentifier(decodedDomain, true);

  if (!tenant) {
    return notFound();
  }

  const primaryColor = tenant.primary_color || '#3b82f6';

  // Contrôle du plan d'abonnement : Vérification de l'activation du pilier Académie (LMS)
  if (tenant.subscription && !tenant.subscription.is_academy_enabled) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-2xl">
          🔒
        </div>
        <h2 className="text-xl font-bold text-white">Module Académie non souscrit</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          L'espace de formation n'est pas activé dans l'abonnement actuel de cette boutique.
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  // Isolation stricte : Requête filtrée à 100% sur tenant_id = tenant.id
  const courses = await getTenantCourses(tenant.id);

  return (
    <div className="space-y-8">
      {/* En-tête du Catalogue */}
      <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <span>/</span>
            <span style={{ color: primaryColor }}>Catalogue des formations</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-2">
            Formations & Ateliers — {tenant.name}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Développez votre savoir-faire grâce à notre catalogue complet de cours structurés.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <span className="font-semibold text-white">{courses.length}</span> formation(s) disponible(s)
        </div>
      </div>

      {/* Grille des Formations Isolées */}
      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-16 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-2xl">
            🎓
          </div>
          <h2 className="text-xl font-bold text-white">Catalogue en cours de création</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Aucun module n'a été publié pour le moment. Revenez très bientôt pour découvrir nos nouveaux contenus.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition-colors"
          >
            Retour à l'accueil
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <article
              key={course.id}
              className="flex flex-col rounded-xl overflow-hidden bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all duration-200 group"
            >
              {/* Image d'illustration */}
              <div className="relative aspect-video w-full bg-slate-800 overflow-hidden">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600 text-3xl font-bold">
                    {course.title.charAt(0)}
                  </div>
                )}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-950/85 text-white backdrop-blur-md border border-slate-700/60 shadow-sm">
                  {course.price === 0 ? 'Gratuit' : `${course.price.toLocaleString('fr-FR')} FCFA`}
                </div>
              </div>

              {/* Contenu textuel */}
              <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                <div>
                  <h2 className="font-bold text-lg text-white group-hover:text-slate-200 transition-colors line-clamp-2">
                    {course.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-2 line-clamp-3">
                    {course.description || 'Apprenez à votre rythme avec des leçons claires et des cas pratiques adaptés.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span>📖</span>
                    <span>{course.lessons_count ? `${course.lessons_count} module(s)` : 'Multi-leçons'}</span>
                  </div>

                  <Link
                    href={`/courses/${course.slug}`}
                    className="text-xs font-semibold px-4 py-2 rounded-lg text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Accéder au cours
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
