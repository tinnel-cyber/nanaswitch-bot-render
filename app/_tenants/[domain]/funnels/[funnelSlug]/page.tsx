import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantByIdentifier, getTenantFunnel } from '@/lib/tenants';
import { getAffiliateUrl } from '@/lib/affiliate';

interface FunnelPageProps {
  params: Promise<{ domain: string; funnelSlug: string }>;
}

export default async function FunnelPage({ params }: FunnelPageProps) {
  const { domain, funnelSlug } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const tenant = await getTenantByIdentifier(decodedDomain, true);

  if (!tenant) {
    return notFound();
  }

  const funnel = await getTenantFunnel(tenant.id, funnelSlug);
  if (!funnel) {
    return notFound();
  }

  const primaryColor = tenant.primary_color || '#3b82f6';
  const tData = funnel.template_data || {};

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-12">
      {/* Badge du Tunnel de Vente */}
      <div className="text-center space-y-4">
        <span
          className="inline-block px-4 py-1.5 rounded-full text-xs font-bold text-white uppercase tracking-wider shadow-sm"
          style={{ backgroundColor: primaryColor }}
        >
          {tData.badge || 'Offre Spéciale Limitée'}
        </span>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          {funnel.title || tData.headline || 'Transformez vos compétences dès aujourd’hui'}
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {tData.subheadline || 'Accédez à la méthode éprouvée qui a permis à nos étudiants de franchir un cap.'}
        </p>
      </div>

      {/* Carte Centrale du Tunnel / Vidéo de Présentation */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-10 shadow-2xl space-y-8">
        {tData.video_url ? (
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-800 shadow-lg">
            <iframe
              src={tData.video_url}
              className="w-full h-full border-0"
              allowFullScreen
              title="Présentation de l'offre"
            />
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
            <div className="text-4xl">🚀</div>
            <h2 className="text-xl font-bold text-white">Prêt à démarrer l'aventure ?</h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              Rejoignez des centaines de participants et accédez immédiatement aux modules exclusifs de l'Académie {tenant.name}.
            </p>
          </div>
        )}

        {/* Bénéfices Clés */}
        {Array.isArray(tData.bullet_points) && tData.bullet_points.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="font-bold text-white text-base">Ce que vous allez obtenir :</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300">
              {tData.bullet_points.map((pt: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bouton d'Action (Call To Action) */}
        <div className="text-center pt-6 space-y-3">
          <Link
            href={tData.cta_url || '/courses'}
            className="inline-block w-full sm:w-auto px-8 py-4 rounded-xl text-white font-extrabold text-base tracking-wide shadow-xl hover:opacity-95 active:scale-95 transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            {tData.cta_text || 'Découvrir nos formations complètes →'}
          </Link>
          <p className="text-xs text-slate-500">
            Paiement 100% sécurisé — Accès immédiat •{' '}
            <a
              href={getAffiliateUrl(tenant.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors underline decoration-slate-600 underline-offset-2"
            >
              Propulsé par <strong className="font-semibold text-slate-300">Nanasore</strong>
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
