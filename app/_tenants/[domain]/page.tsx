import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantByIdentifier, getTenantCourses } from '@/lib/tenants';

interface TenantHomePageProps {
  params: Promise<{ domain: string }>;
}

export default async function TenantHomePage({ params }: TenantHomePageProps) {
  const { domain } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const tenant = await getTenantByIdentifier(decodedDomain, true);

  if (!tenant) {
    return notFound();
  }

  // Récupération isolée des cours du tenant
  const courses = await getTenantCourses(tenant.id);
  const featuredCourses = courses.slice(0, 3);
  const primaryColor = tenant.primary_color || '#3b82f6';

  return (
    <div className="space-y-16">
      {/* Bannière Hero Principale */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-800/60 to-slate-900/60 border border-slate-800 p-8 sm:p-12 text-center sm:text-left">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
            Portail Officiel d'Apprentissage & Formation
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Bienvenue sur l'Académie{' '}
            <span style={{ color: primaryColor }}>{tenant.name}</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
            Découvrez nos formations exclusives, nos ateliers pratiques et maîtrisez les compétences clés pour accélérer votre réussite.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/courses"
              className="px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-lg hover:opacity-90 active:scale-95 transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              Explorer les formations ({courses.length})
            </Link>
            <a
              href="#catalogue"
              className="px-6 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 font-semibold text-sm border border-slate-700 transition-all"
            >
              En savoir plus
            </a>
          </div>
        </div>
      </section>

      {/* Section Formations Vedettes */}
      <section id="catalogue" className="space-y-8">
        <div className="flex items-end justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Formations à la Une</h2>
            <p className="text-sm text-slate-400 mt-1">Sélection de parcours certifiants et modules intensifs</p>
          </div>
          {courses.length > 3 && (
            <Link
              href="/courses"
              className="text-sm font-semibold hover:underline"
              style={{ color: primaryColor }}
            >
              Voir tout ({courses.length}) →
            </Link>
          )}
        </div>

        {courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3 text-xl">
              📚
            </div>
            <h3 className="text-lg font-semibold text-slate-200">Aucune formation publiée pour le moment</h3>
            <p className="text-sm text-slate-400 mt-1">Le formateur est actuellement en train de préparer de nouveaux cours.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCourses.map((course) => (
              <div
                key={course.id}
                className="group flex flex-col rounded-xl overflow-hidden bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all duration-300 hover:shadow-xl"
              >
                {/* Miniature du cours */}
                <div className="relative aspect-video w-full bg-slate-800 overflow-hidden">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-3xl font-bold">
                      {course.title.charAt(0)}
                    </div>
                  )}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-950/80 text-white backdrop-blur-sm border border-slate-700/50">
                    {course.price === 0 ? 'Gratuit' : `${course.price.toLocaleString('fr-FR')} FCFA`}
                  </div>
                </div>

                {/* Corps de la carte */}
                <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-slate-200 transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                      {course.description || 'Découvrez ce programme complet conçu pour développer vos compétences.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {course.lessons_count ? `${course.lessons_count} leçon(s)` : 'Accès illimité'}
                    </span>
                    <Link
                      href={`/courses/${course.slug}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Découvrir
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
