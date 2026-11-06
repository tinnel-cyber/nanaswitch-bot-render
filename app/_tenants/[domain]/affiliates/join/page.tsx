import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantByIdentifier } from '@/lib/tenants';
import AffiliateJoinFormClient from './AffiliateJoinFormClient';

interface AffiliateJoinPageProps {
  params: Promise<{ domain: string }>;
}

export default async function AffiliateJoinPage({ params }: AffiliateJoinPageProps) {
  const { domain } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const tenant = await getTenantByIdentifier(decodedDomain, true);

  if (!tenant) {
    return notFound();
  }

  const primaryColor = tenant.primary_color || '#3b82f6';
  const defaultRate = tenant.settings?.tenant_affiliate_default_rate ?? 15;

  return (
    <div className="max-w-3xl mx-auto space-y-10 py-6">
      {/* En-tête de la page */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 border border-slate-800 text-slate-300">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
          Programme Ambassadeurs & Partenaires
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Devenez Affilié Officiel de <span style={{ color: primaryColor }}>{tenant.name}</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
          Recommandez nos formations certifiantes, produits et webinaires exclusifs auprès de votre audience et touchez{' '}
          <strong className="text-white font-bold">{defaultRate}% de commission directe</strong> sur chaque commande validée.
        </p>
      </div>

      {/* Cartes d'Avantages */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="text-2xl">💰</div>
          <div className="font-bold text-white text-sm">{defaultRate}% de Commission</div>
          <p className="text-xs text-slate-400">Rémunération garantie sur chaque vente apportée</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="text-2xl">⚡</div>
          <div className="font-bold text-white text-sm">Paiements Rapides</div>
          <p className="text-xs text-slate-400">Versement via Wave, Orange Money ou Virement</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="text-2xl">📊</div>
          <div className="font-bold text-white text-sm">Liens & Stats en Direct</div>
          <p className="text-xs text-slate-400">Suivi transparent de vos clics et gains en temps réel</p>
        </div>
      </div>

      {/* Formulaire Client de Souscription */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">Formulaire de Souscription Ambassadeur</h2>
          <p className="text-xs text-slate-400 mt-1">
            Remplissez vos coordonnées pour générer immédiatement vos liens d'affiliation personnalisés.
          </p>
        </div>

        <AffiliateJoinFormClient
          tenantId={tenant.id}
          tenantSlug={tenant.slug}
          primaryColor={primaryColor}
          defaultRate={defaultRate}
          domain={decodedDomain}
        />
      </div>

      {/* Mention de retour */}
      <div className="text-center text-xs text-slate-500">
        Vous avez déjà un code affilié ?{' '}
        <Link href="/affiliates/dashboard" className="text-slate-300 hover:text-white underline">
          Accéder à mon tableau de bord affilié
        </Link>
      </div>
    </div>
  );
}
