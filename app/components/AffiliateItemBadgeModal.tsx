'use client';

import { useState } from 'react';
import { Tag, Sparkles, X, Check, Copy, UserCheck, ShieldCheck } from 'lucide-react';

interface AffiliateItemBadgeModalProps {
  tenantId: string;
  tenantName: string;
  tenantDomain: string;
  itemType: 'course' | 'product' | 'webinar' | 'live_shopping';
  itemId: string;
  itemTitle: string;
  itemSlug: string;
  commissionRate: number;
  primaryColor?: string;
}

export default function AffiliateItemBadgeModal({
  tenantId,
  tenantName,
  tenantDomain,
  itemType,
  itemId,
  itemTitle,
  itemSlug,
  commissionRate,
  primaryColor = '#3b82f6',
}: AffiliateItemBadgeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'existing' | 'new'>('existing');

  // État formulaire existant
  const [existingCode, setExistingCode] = useState('');
  // État formulaire nouveau
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [desiredCode, setDesiredCode] = useState('');
  const [payoutChannel, setPayoutChannel] = useState('Wave');
  const [payoutDetails, setPayoutDetails] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Construction du lien d'affiliation
  const protocol = tenantDomain.includes('localhost') ? 'http' : 'https';
  const itemPath = itemType === 'course' ? `/courses/${itemSlug}` : `/products/${itemSlug}`;

  async function handleExistingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/affiliates/item-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          item_type: itemType,
          item_id: itemId,
          item_title: itemTitle,
          affiliate_code: existingCode.trim().toUpperCase(),
          is_new_applicant: false,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Code affilié introuvable pour cette boutique.');
      }

      setSuccessData(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'ajout du produit.');
    } finally {
      setLoading(false);
    }
  }

  async function handleNewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/affiliates/item-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          item_type: itemType,
          item_id: itemId,
          item_title: itemTitle,
          affiliate_code: desiredCode.trim().toUpperCase(),
          is_new_applicant: true,
          applicant_data: {
            full_name: fullName,
            email,
            whatsapp_number: whatsapp,
            payout_channel: payoutChannel,
            payout_account_details: payoutDetails,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la création du compte affilié.');
      }

      setSuccessData(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setLoading(false);
    }
  }

  const generatedLink = successData
    ? `${protocol}://${tenantDomain}${itemPath}?taf=${successData.affiliate_code}`
    : '';

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      {/* 1. Le Petit Badge Affilié sur la fiche Produit / Cours */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setError(null);
          setSuccessData(null);
        }}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/70 border border-emerald-800 text-emerald-300 hover:bg-emerald-900/80 hover:border-emerald-600 transition-all cursor-pointer shadow-sm group active:scale-95"
      >
        <Sparkles className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
        <span>Programme Affilié : Gagnez <strong>{commissionRate}%</strong> sur cette vente</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-200 border border-emerald-700/60 uppercase font-bold">
          Vendre ce produit
        </span>
      </button>

      {/* 2. Modale Interactive de Souscription / Ajout à la liste */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
            {/* Bouton Fermer */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* En-tête */}
            <div className="space-y-1.5 pr-8">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Tag className="w-4 h-4" />
                Affiliation : {commissionRate}% de commission
              </div>
              <h3 className="text-lg font-extrabold text-white">
                Vendez « {itemTitle} » et encaissez vos commissions
              </h3>
              <p className="text-xs text-slate-400">
                Boutique partenaire : <strong>{tenantName}</strong>
              </p>
            </div>

            {/* Si l'opération a réussi */}
            {successData ? (
              <div className="space-y-5 py-4 animate-fadeIn">
                <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800 text-xs text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                    <Check className="w-4 h-4" /> Produit ajouté avec succès à votre liste affiliée !
                  </div>

                  {successData.validation_target === 'super_admin' ? (
                    <p className="leading-relaxed text-emerald-200/90">
                      🛡️ Cette boutique opérant sur l'offre <strong>Standard</strong>, votre demande a été envoyée au <strong>Dashboard Super Admin Nanasore</strong> pour validation centrale officielle.
                    </p>
                  ) : (
                    <p className="leading-relaxed text-emerald-200/90">
                      ⚡ Cette boutique opérant en <strong>Marque Blanche</strong>, votre profil affilié est géré directement par <strong>{tenantName}</strong>.
                    </p>
                  )}
                </div>

                <div className="space-y-2 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase">
                    Votre Lien de Vente Personnel ({commissionRate}%) :
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 select-all"
                    />
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="px-3.5 py-2 rounded-lg text-white font-bold text-xs shadow hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              // Navigation par onglets
              <div className="space-y-5 pt-4">
                <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => { setTab('existing'); setError(null); }}
                    className={`py-2 rounded-lg transition-all ${
                      tab === 'existing'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    J'ai déjà un Code Affilié
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTab('new'); setError(null); }}
                    className={`py-2 rounded-lg transition-all ${
                      tab === 'new'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Nouveau ? Créer un Compte
                  </button>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs">
                    ⚠️ {error}
                  </div>
                )}

                {/* Onglet 1 : Affilié existant */}
                {tab === 'existing' ? (
                  <form onSubmit={handleExistingSubmit} className="space-y-4">
                    <p className="text-xs text-slate-300">
                      Entrez votre code d'affiliation pour ajouter immédiatement ce cours ou produit à vos liens de recommandation.
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Votre Code Affilié</label>
                      <input
                        type="text"
                        required
                        value={existingCode}
                        onChange={(e) => setExistingCode(e.target.value.toUpperCase())}
                        placeholder="Ex: ALEX10"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white placeholder-slate-500 uppercase focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {loading ? 'Vérification...' : 'Ajouter à ma liste de vente'}
                    </button>
                  </form>
                ) : (
                  // Onglet 2 : Nouveau candidat affilié
                  <form onSubmit={handleNewSubmit} className="space-y-3.5">
                    <p className="text-xs text-slate-300">
                      Remplissez vos coordonnées. Vos informations seront validées selon le type de compte (Whitelabel ou Standard Super Admin).
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300">Nom Complet *</label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ex: Sokhna Ba"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300">Email *</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="sokhna@example.com"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300">WhatsApp *</label>
                        <input
                          type="tel"
                          required
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          placeholder="+221 77..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300">Code Souhaité *</label>
                        <input
                          type="text"
                          required
                          value={desiredCode}
                          onChange={(e) => setDesiredCode(e.target.value.toUpperCase())}
                          placeholder="Ex: SOKHNA20"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white uppercase focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300">Paiement</label>
                        <select
                          value={payoutChannel}
                          onChange={(e) => setPayoutChannel(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="Wave">Wave</option>
                          <option value="Orange Money">Orange Money</option>
                          <option value="MTN Mobile Money">MTN</option>
                          <option value="Moov Money">Moov</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300">N° Mobile Money *</label>
                        <input
                          type="text"
                          required
                          value={payoutDetails}
                          onChange={(e) => setPayoutDetails(e.target.value)}
                          placeholder="Votre numéro pour encaisser"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer mt-2"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {loading ? 'Traitement en cours...' : 'Créer mon compte & Obtenir mon lien'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
