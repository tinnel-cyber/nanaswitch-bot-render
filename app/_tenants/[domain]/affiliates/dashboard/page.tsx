import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantByIdentifier, getTenantCourses, getTenantProducts } from '@/lib/tenants';
import { getTenantAffiliateByCode, getTenantAffiliatePromotionUrl } from '@/lib/affiliate';

interface AffiliateDashboardPageProps {
  params: Promise<{ domain: string }>;
  searchParams?: Promise<{ code?: string }>;
}

export default async function TenantAffiliateDashboardPage({
  params,
  searchParams,
}: AffiliateDashboardPageProps) {
  const { domain } = await params;
  const sParams = searchParams ? await searchParams : {};
  const decodedDomain = decodeURIComponent(domain);
  const tenant = await getTenantByIdentifier(decodedDomain, true);

  if (!tenant) {
    return notFound();
  }

  const affiliateCode = sParams.code?.trim().toUpperCase();
  const affiliate = affiliateCode ? await getTenantAffiliateByCode(tenant.id, affiliateCode) : null;
  const primaryColor = tenant.primary_color || '#3b82f6';

  const [courses, products] = await Promise.all([
    getTenantCourses(tenant.id),
    getTenantProducts(tenant.id),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* En-tête */}
      <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Link href="/" className="hover:text-white">Accueil</Link>
            <span>/</span>
            <span style={{ color: primaryColor }}>Espace Affilié</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Tableau de Bord Partenaire — {tenant.name}
          </h1>
        </div>

        <Link
          href="/affiliates/join"
          className="text-xs px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          Créer un autre code
        </Link>
      </div>

      {!affiliate ? (
        // Invitation à entrer son code ou à s'inscrire
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-8 text-center space-y-6 max-w-lg mx-auto">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-3xl">
            🔑
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Consulter vos performances</h2>
            <p className="text-xs text-slate-400">
              Entrez votre code d'affiliation personnel pour afficher vos gains, vos ventes et vos liens de promotion.
            </p>
          </div>

          <form action="/affiliates/dashboard" method="GET" className="space-y-3">
            <input
              type="text"
              name="code"
              required
              placeholder="Ex: ALEX10"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-center text-white uppercase focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:opacity-90 active:scale-95 transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              Afficher mes statistiques
            </button>
          </form>

          <p className="text-xs text-slate-500">
            Pas encore ambassadeur ?{' '}
            <Link href="/affiliates/join" className="text-slate-300 underline hover:text-white">
              Souscrire en 1 minute
            </Link>
          </p>
        </div>
      ) : (
        // Tableau de bord avec métriques et liens prêts à copier
        <div className="space-y-8">
          {/* Cartes d'indicateurs financiers */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[11px] uppercase font-bold text-slate-400">Code Actif</span>
              <div className="text-xl font-black text-white font-mono mt-1">{affiliate.affiliate_code}</div>
              <span className="text-[10px] text-emerald-400 font-semibold">Taux : {affiliate.custom_commission_rate ?? 15}%</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[11px] uppercase font-bold text-slate-400">Ventes Apportées</span>
              <div className="text-xl font-black text-white mt-1">{affiliate.total_sales_count}</div>
              <span className="text-[10px] text-slate-500">Commandes client</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[11px] uppercase font-bold text-slate-400">Chiffre Généré</span>
              <div className="text-xl font-black text-white mt-1">
                {affiliate.total_sales_amount.toLocaleString('fr-FR')} XOF
              </div>
              <span className="text-[10px] text-slate-500">Volume brut</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[11px] uppercase font-bold text-slate-400">Gains à Percevoir</span>
              <div className="text-xl font-black text-emerald-400 mt-1">
                {(affiliate.total_commissions_earned - affiliate.total_commissions_paid).toLocaleString('fr-FR')} XOF
              </div>
              <span className="text-[10px] text-slate-500">Paiement : {affiliate.payout_channel}</span>
            </div>
          </div>

          {/* Lien Général de l'Affilié */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white">Votre Lien d'Affiliation Principal</h3>
            <p className="text-xs text-slate-400">
              Ce lien redirige vers l'accueil de la boutique. Toute commande passée par votre contact est attribuée à votre compte.
            </p>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-blue-400 select-all break-all">
              {getTenantAffiliatePromotionUrl(decodedDomain, affiliate.affiliate_code)}
            </div>
          </div>

          {/* Liens spécifiques par Formations */}
          {courses.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Vos Liens de Promotion Formations ({courses.length})</h3>
              <div className="space-y-2">
                {courses.map((course) => {
                  const courseLink = getTenantAffiliatePromotionUrl(
                    decodedDomain,
                    affiliate.affiliate_code,
                    `/courses/${course.slug}`
                  );
                  return (
                    <div
                      key={course.id}
                      className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-sm text-white">{course.title}</div>
                        <div className="text-xs text-slate-400">
                          Tarif : {course.price.toLocaleString('fr-FR')} XOF • Gain estimé :{' '}
                          <strong className="text-emerald-400">
                            {Math.round(course.price * ((affiliate.custom_commission_rate ?? 15) / 100)).toLocaleString('fr-FR')} XOF
                          </strong>
                        </div>
                      </div>

                      <div className="font-mono text-xs text-slate-300 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 select-all truncate max-w-sm">
                        {courseLink}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Liens spécifiques par Produits */}
          {products.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Vos Liens de Promotion Produits ({products.length})</h3>
              <div className="space-y-2">
                {products.map((product) => {
                  const productLink = getTenantAffiliatePromotionUrl(
                    decodedDomain,
                    affiliate.affiliate_code,
                    `/products/${product.slug}`
                  );
                  return (
                    <div
                      key={product.id}
                      className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-sm text-white">{product.title}</div>
                        <div className="text-xs text-slate-400">
                          Prix : {product.price.toLocaleString('fr-FR')} XOF • Commission :{' '}
                          <strong className="text-emerald-400">
                            {Math.round(product.price * ((affiliate.custom_commission_rate ?? 15) / 100)).toLocaleString('fr-FR')} XOF
                          </strong>
                        </div>
                      </div>

                      <div className="font-mono text-xs text-slate-300 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 select-all truncate max-w-sm">
                        {productLink}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
