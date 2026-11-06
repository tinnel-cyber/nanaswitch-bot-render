import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantByIdentifier, getTenantCourses } from '@/lib/tenants';
import { getAffiliateUrl } from '@/lib/affiliate';

interface StandardAcademyPageProps {
  params: Promise<{ slug: string }>;
}

export default async function StandardAcademyPage({ params }: StandardAcademyPageProps) {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug).toLowerCase();

  // Résolution pour les tenants Standard via leur slug (isCustomDomain = false)
  const tenant = await getTenantByIdentifier(cleanSlug, false);

  if (!tenant) {
    return notFound();
  }

  // Chargement strict des cours du tenant standard
  const courses = await getTenantCourses(tenant.id);
  const primaryColor = tenant.primary_color || '#2563eb';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      {/* Barre de navigation standard Académie */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.name} className="h-9 w-auto rounded object-contain" />
            ) : (
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-white shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {tenant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <span className="font-bold text-white text-base block">{tenant.name}</span>
              <a
                href={getAffiliateUrl(tenant.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-slate-400 hover:text-white transition-colors"
              >
                Propulsé par <strong className="font-semibold text-slate-300">Nanasore</strong>
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              Portail Central
            </Link>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Boutique Active
            </span>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Bannière de présentation */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 p-8 sm:p-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 border border-slate-700 text-slate-300">
            <span>🎓</span> Espace de formation standard
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            Académie {tenant.name}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
            Explorez l'ensemble des parcours et cours dispensés par {tenant.name}.
          </p>
        </div>

        {/* Catalogue des formations de ce tenant */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-white">Formations Disponibles</h2>
            <span className="text-xs text-slate-400">{courses.length} formation(s)</span>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center text-slate-400 space-y-2">
              <p className="text-base font-semibold text-slate-300">Aucune formation publiée</p>
              <p className="text-xs text-slate-500">Le formateur publiera prochainement ses premiers cours.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-xl overflow-hidden bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="aspect-video w-full bg-slate-800 overflow-hidden relative">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-3xl font-bold">
                        {course.title.charAt(0)}
                      </div>
                    )}
                    <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/80 text-white text-xs font-bold border border-slate-700">
                      {course.price === 0 ? 'Gratuit' : `${course.price.toLocaleString('fr-FR')} FCFA`}
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="font-bold text-white text-base line-clamp-1">{course.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{course.description || 'Formation complète.'}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{course.lessons_count || 0} module(s)</span>
                      <a
                        href={`/courses/${course.slug}`}
                        className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Voir les détails
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Pied de page */}
      <footer className="border-t border-slate-800 bg-slate-950/60 py-8 text-center text-xs text-slate-500 mt-16">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {tenant.name}. Tous droits réservés.</p>
          <a
            href={getAffiliateUrl(tenant.slug)}
            target="_blank"
            rel="noopener noreferrer"
            title="Créer votre boutique ou académie sur Nanasore"
            className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5 group"
          >
            <span className="group-hover:underline">Propulsé par</span>
            <strong className="text-slate-200 group-hover:text-white font-semibold">Nanasore</strong>
          </a>
        </div>
      </footer>
    </div>
  );
}
