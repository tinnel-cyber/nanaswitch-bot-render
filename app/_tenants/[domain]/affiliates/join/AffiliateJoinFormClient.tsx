'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  tenantId: string;
  tenantSlug: string;
  primaryColor: string;
  defaultRate: number;
  domain: string;
}

export default function AffiliateJoinFormClient({
  tenantId,
  tenantSlug,
  primaryColor,
  defaultRate,
  domain,
}: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [payoutChannel, setPayoutChannel] = useState('Wave');
  const [payoutAccountDetails, setPayoutAccountDetails] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredAffiliate, setRegisteredAffiliate] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/tenants/affiliates/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          full_name: fullName,
          email,
          whatsapp_number: whatsappNumber,
          affiliate_code: affiliateCode,
          payout_channel: payoutChannel,
          payout_account_details: payoutAccountDetails,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Impossible d\'enregistrer votre candidature');
      }

      setRegisteredAffiliate(data.affiliate);
    } catch (err: any) {
      setError(err.message || 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  }

  // Succès : Affichage immédiat du tableau de bord d'affiliation et des liens
  if (registeredAffiliate) {
    const code = registeredAffiliate.affiliate_code;
    const protocol = domain.includes('localhost') ? 'http' : 'https';
    const mainAffiliateLink = `${protocol}://${domain}?taf=${code}`;

    const handleCopy = () => {
      navigator.clipboard.writeText(mainAffiliateLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    };

    return (
      <div className="space-y-6 text-left animate-fadeIn">
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-sm flex items-center gap-3">
          <span className="text-xl">🎉</span>
          <div>
            <strong>Félicitations {registeredAffiliate.full_name} !</strong>
            <p className="text-xs text-emerald-300 mt-0.5">
              Votre compte affilié est validé. Vous touchez <strong>{defaultRate}% de commission</strong> sur chaque vente.
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Votre Code Partenaire Unique</span>
            <span className="px-3 py-1 rounded bg-slate-800 text-white font-mono font-bold text-sm border border-slate-700">
              {code}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-medium">Votre Lien d'Affiliation Global (Boutique & Académie) :</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={mainAffiliateLink}
                className="flex-1 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2.5 rounded-lg text-white font-bold text-xs shadow-sm hover:opacity-90 active:scale-95 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                {copiedLink ? 'Copié ! ✓' : 'Copier'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs text-slate-400">
          <div className="font-semibold text-slate-200">Comment promouvoir et toucher vos commissions ?</div>
          <p>1. Partagez votre lien sur vos réseaux sociaux, statut WhatsApp, chaîne Telegram ou auprès de vos contacts.</p>
          <p>2. Dès qu'une personne clique et achète un cours ou produit, {defaultRate}% du montant est immédiatement crédité.</p>
          <p>3. Les gains sont versés directement sur votre compte <strong>{registeredAffiliate.payout_channel}</strong>.</p>
        </div>

        <div className="flex justify-between items-center pt-2">
          <Link href="/" className="text-xs text-slate-400 hover:text-white underline">
            ← Retour à l'accueil
          </Link>
          <Link
            href={`/affiliates/dashboard?code=${code}`}
            className="text-xs font-bold px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Consulter mon tableau de bord affilié →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left">
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Nom et Prénom *</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ex: Amadou Diallo"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Adresse Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="amadou@example.com"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Numéro WhatsApp (pour suivi) *</label>
          <input
            type="tel"
            required
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+221 77 000 00 00"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Code Affilié Souhaité *</label>
          <input
            type="text"
            required
            value={affiliateCode}
            onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
            placeholder="Ex: AMADOU10"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Moyen de Versement des Commissions</label>
          <select
            value={payoutChannel}
            onChange={(e) => setPayoutChannel(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="Wave">Wave</option>
            <option value="Orange Money">Orange Money</option>
            <option value="MTN Mobile Money">MTN Mobile Money</option>
            <option value="Moov Money">Moov Money</option>
            <option value="Virement Bancaire">Virement Bancaire</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Numéro ou Détails de Paiement *</label>
          <input
            type="text"
            required
            value={payoutAccountDetails}
            onChange={(e) => setPayoutAccountDetails(e.target.value)}
            placeholder="Numéro Wave / OM pour recevoir vos sous"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-xl text-white font-extrabold text-sm uppercase tracking-wider shadow-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 mt-4"
        style={{ backgroundColor: primaryColor }}
      >
        {loading ? 'Création de votre compte affilié...' : `Rejoindre et activer mes ${defaultRate}% de commission`}
      </button>
    </form>
  );
}
