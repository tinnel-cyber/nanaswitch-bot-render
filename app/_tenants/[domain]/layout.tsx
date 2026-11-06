import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantByIdentifier } from '@/lib/tenants';
import { getAffiliateUrl } from '@/lib/affiliate';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { domain } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const tenant = await getTenantByIdentifier(decodedDomain, true);

  if (!tenant) {
    return notFound();
  }

  const sub = tenant.subscription;

  // 1. Contrôle d'état de l'abonnement du tenant (Suspension/Expiration)
  if (sub?.status === 'EXPIRED' || sub?.status === 'CANCELLED') {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-950/60 border border-amber-800/80 flex items-center justify-center text-2xl text-amber-400">
            ⏳
          </div>
          <h1 className="text-xl font-bold text-white">Espace Temporairement Indisponible</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            L'accès à l'espace de <strong>{tenant.name}</strong> est actuellement en cours de renouvellement. Veuillez réessayer ultérieurement ou contacter le gestionnaire.
          </p>
        </div>
      </div>
    );
  }

  // Couleurs dynamiques de la marque blanche
  const primaryColor = tenant.primary_color || '#3b82f6';
  const secondaryColor = tenant.secondary_color || '#0f172a';

  // Droits modulaires selon le plan d'abonnement
  const isStoreEnabled = sub?.is_store_enabled !== false;
  const isAcademyEnabled = sub?.is_academy_enabled !== false;
  const allowWhitelabelRemoval = sub?.allow_whitelabel_removal ?? true;

  return (
    <div
      className="min-h-screen flex flex-col text-slate-100"
      style={{
        backgroundColor: '#090d16',
        ['--tenant-primary' as any]: primaryColor,
        ['--tenant-secondary' as any]: secondaryColor,
      }}
    >
      {/* Barre de navigation Marque Blanche filtrée par les piliers d'abonnement */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo et Nom du Tenant */}
          <Link href="/" className="flex items-center gap-3 group">
            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="h-9 w-auto max-w-[140px] object-contain rounded"
              />
            ) : (
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-white shadow-sm transition-transform group-hover:scale-105"
                style={{ backgroundColor: primaryColor }}
              >
                {tenant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-lg tracking-tight text-white group-hover:text-slate-200">
              {tenant.name}
            </span>
          </Link>

          {/* Liens de navigation dynamiques selon les piliers actifs de l'abonnement */}
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link
              href="/"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Accueil
            </Link>

            {/* Pilier Boutique E-commerce */}
            {isStoreEnabled && (
              <Link
                href="/products"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Boutique
              </Link>
            )}

            {/* Pilier Académie & Formations */}
            {isAcademyEnabled && (
              <Link
                href="/courses"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Formations & Cours
              </Link>
            )}

            <a
              href="/auth/register"
              className="px-4 py-2 rounded-lg text-white font-medium text-xs tracking-wider uppercase transition-all duration-200 shadow-sm hover:opacity-90 active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              Mon Espace
            </a>
          </nav>
        </div>
      </header>

      {/* Contenu principal de la page du tenant */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Pied de page Marque Blanche avec gestion du badge selon le plan */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {tenant.name}. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            {isStoreEnabled && <Link href="/products" className="hover:text-slate-400">Boutique</Link>}
            {isAcademyEnabled && <Link href="/courses" className="hover:text-slate-400">Formations</Link>}
            <Link href="/affiliates/join" className="hover:text-slate-400">Devenir Affilié</Link>
            <span>•</span>
            <a
              href={getAffiliateUrl(tenant.slug)}
              target="_blank"
              rel="noopener noreferrer"
              title="Créer votre boutique ou académie sur Nanasore"
              className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5 group"
            >
              <span className="group-hover:underline">Propulsé par</span>
              <strong className="text-slate-200 group-hover:text-white font-semibold tracking-wide">Nanasore</strong>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
