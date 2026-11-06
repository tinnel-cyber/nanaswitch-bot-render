import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantByIdentifier, getTenantProductBySlug } from '@/lib/tenants';
import { getAffiliateUrl } from '@/lib/affiliate';
import AffiliateItemBadgeModal from '@/app/components/AffiliateItemBadgeModal';

interface ProductDetailPageProps {
  params: Promise<{ domain: string; productSlug: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { domain, productSlug } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const tenant = await getTenantByIdentifier(decodedDomain, true);

  if (!tenant) {
    return notFound();
  }

  const product = await getTenantProductBySlug(tenant.id, productSlug);
  if (!product) {
    return notFound();
  }

  const primaryColor = tenant.primary_color || '#3b82f6';

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Link href="/" className="hover:text-white">Accueil</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-white">Boutique</Link>
        <span>/</span>
        <span className="text-white truncate max-w-xs">{product.title}</span>
      </nav>

      {/* Fiche Produit Principale */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* Visuel du produit */}
        <div className="aspect-square w-full rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden relative shadow-2xl">
          {product.thumbnail_url ? (
            <img
              src={product.thumbnail_url}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              📦
            </div>
          )}
        </div>

        {/* Spécifications & Commande */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                {product.category || 'Article officiel'}
              </span>

              {/* Badge interactif d'affiliation pour vendre ce produit */}
              {((product as any).is_affiliate_enabled ?? true) && (
                <AffiliateItemBadgeModal
                  tenantId={tenant.id}
                  tenantName={tenant.name}
                  tenantDomain={decodedDomain}
                  itemType="product"
                  itemId={product.id}
                  itemTitle={product.title}
                  itemSlug={product.slug}
                  commissionRate={(product as any).affiliate_commission_rate ?? 15}
                  primaryColor={primaryColor}
                />
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {product.title}
            </h1>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Prix TTC</span>
            <span className="text-2xl font-black text-white">
              {product.price.toLocaleString('fr-FR')} FCFA
            </span>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-200">Description</h2>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {product.description || 'Produit de qualité supérieure certifié et distribué par notre boutique.'}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <button
              className="w-full py-4 px-6 rounded-xl text-white font-extrabold text-sm uppercase tracking-wide shadow-xl hover:opacity-90 active:scale-95 transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              Commander maintenant — Encaissement direct
            </button>
            <p className="text-center text-xs text-slate-500">
              Transaction directe et sécurisée •{' '}
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
    </div>
  );
}
