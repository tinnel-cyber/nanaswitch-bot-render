import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantByIdentifier, getTenantCourseBySlug } from '@/lib/tenants';
import AffiliateItemBadgeModal from '@/app/components/AffiliateItemBadgeModal';

interface CourseDetailPageProps {
  params: Promise<{ domain: string; courseSlug: string }>;
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { domain, courseSlug } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const tenant = await getTenantByIdentifier(decodedDomain, true);

  if (!tenant) {
    return notFound();
  }

  // Récupération stricte de la formation et de ses leçons pour ce tenant précis
  const result = await getTenantCourseBySlug(tenant.id, courseSlug);
  if (!result || !result.course) {
    return notFound();
  }

  const { course, lessons } = result;
  const primaryColor = tenant.primary_color || '#3b82f6';

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Link href="/" className="hover:text-white">Accueil</Link>
        <span>/</span>
        <Link href="/courses" className="hover:text-white">Formations</Link>
        <span>/</span>
        <span className="text-white truncate max-w-xs">{course.title}</span>
      </nav>

      {/* Hero Présentation Formation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider"
                style={{ backgroundColor: primaryColor }}
              >
                Programme Certifiant
              </span>

              {/* Badge interactif d'affiliation pour vendre ce cours */}
              {((course as any).is_affiliate_enabled ?? true) && (
                <AffiliateItemBadgeModal
                  tenantId={tenant.id}
                  tenantName={tenant.name}
                  tenantDomain={decodedDomain}
                  itemType="course"
                  itemId={course.id}
                  itemTitle={course.title}
                  itemSlug={course.slug}
                  commissionRate={(course as any).affiliate_commission_rate ?? 15}
                  primaryColor={primaryColor}
                />
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              {course.title}
            </h1>
          </div>

          <p className="text-base text-slate-300 leading-relaxed whitespace-pre-line">
            {course.description || "Maîtrisez cette thématique de A à Z avec un programme interactif et pratique."}
          </p>

          {/* Sommaire / Curriculum des leçons */}
          <div className="pt-8 border-t border-slate-800 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center justify-between">
              <span>Curriculum & Leçons</span>
              <span className="text-xs text-slate-400 font-normal">{lessons.length} module(s)</span>
            </h2>

            {lessons.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Le programme des leçons sera publié prochainement.</p>
            ) : (
              <div className="space-y-2.5">
                {lessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-200">{lesson.title}</span>
                    </div>
                    {lesson.is_free_preview && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Aperçu gratuit
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Carte d'Achat & Accès */}
        <div className="sticky top-24 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
          <div className="aspect-video w-full rounded-xl bg-slate-800 overflow-hidden relative">
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600 text-3xl font-bold">
                {course.title.charAt(0)}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold">Tarif d'inscription</div>
            <div className="text-3xl font-extrabold text-white mt-1">
              {course.price === 0 ? 'Gratuit' : `${course.price.toLocaleString('fr-FR')} FCFA`}
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href={`/courses/${course.slug}/learn`}
              className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm text-center block shadow-lg hover:opacity-90 active:scale-95 transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              Accéder à l'espace de visionnage
            </Link>

            <a
              href={`/auth/register?redirect=/courses/${course.slug}/learn`}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs text-center block border border-slate-700 transition-all"
            >
              Rejoindre avec un compte étudiant
            </a>
          </div>

          <div className="text-xs text-slate-500 space-y-2 border-t border-slate-800/80 pt-4">
            <div className="flex items-center gap-2">
              <span>✓</span> <span>Accès à vie et mises à jour incluses</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✓</span> <span>Support dédié {tenant.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✓</span> <span>Certificat de complétion</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
