import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantByIdentifier, getTenantProducts } from '@/lib/tenants';

interface TenantProductsPageProps {
  params: Promise<{ domain: string }>;
}

export default async function TenantProductsPage({ params }: TenantProductsPageProps) {
  const { domain } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const tenant = await getTenantByIdentifier(decodedDomain, true);

  if (!tenant) {
    return notFound();
  }

  const primaryColor = tenant.primary_color || '#3b82f6';

  // Contrôle du plan d'abonnement : Vérification du pilier Vitrine E-commerce
  if (tenant.subscription && !tenant.subscription.is_store_enabled) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-2xl">
          🛍️
        </div>
        <h2 className="text-xl font-bold text-white">Boutique en ligne non activée</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Le catalogue e-commerce n'est pas activé dans le forfait de ce compte.
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

  // Chargement ultra-rapide des produits isolés du tenant
  const products = await getTenantProducts(tenant.id);

  return (
    <div className="space-y-8">
      {/* En-tête du catalogue boutique */}
      <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <span>/</span>
            <span style={{ color: primaryColor }}>Boutique & Produits</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-2">
            Catalogue Produits — {tenant.name}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Découvrez nos articles sélectionnés, prêts à être commandés en direct.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <span className="font-semibold text-white">{products.length}</span> article(s) en rayon
        </div>
      </div>

      {/* Grille des Produits */}
      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-16 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-2xl">
            🛍️
          </div>
          <h2 className="text-xl font-bold text-white">Boutique en cours d'approvisionnement</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Les nouveaux articles seront ajoutés très prochainement sur la boutique.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition-colors"
          >
            Retour au site vitrine
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <article
              key={product.id}
              className="flex flex-col rounded-xl overflow-hidden bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all duration-200 group"
            >
              {/* Image Produit */}
              <div className="relative aspect-square w-full bg-slate-800 overflow-hidden">
                {product.thumbnail_url ? (
                  <img
                    src={product.thumbnail_url}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600 text-4xl font-bold">
                    📦
                  </div>
                )}
                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-950/85 text-white backdrop-blur-md border border-slate-700/60">
                  {product.price.toLocaleString('fr-FR')} FCFA
                </div>
              </div>

              {/* Détails */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    {product.category || 'Article'}
                  </span>
                  <h2 className="font-bold text-sm text-white group-hover:text-slate-200 transition-colors line-clamp-2 mt-0.5">
                    {product.title}
                  </h2>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-medium">En stock</span>
                  <Link
                    href={`/products/${product.slug}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Commander
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
