import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Store,
  CreditCard,
  Smartphone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  ExternalLink,
  ArrowRight,
  FileText
} from 'lucide-react';

interface PaymentLinkDetails {
  id: string;
  merchant_id: string;
  merchant_name: string;
  merchant_sector: string;
  merchant_status?: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  is_active: boolean;
}

interface PublicPaymentLinkPageProps {
  linkId: string;
  onBack?: () => void;
}

const COUNTRIES = [
  { code: 'BF', label: 'Burkina Faso (+226)' },
  { code: 'CI', label: "Côte d'Ivoire (+225)" },
  { code: 'SN', label: 'Sénégal (+221)' },
  { code: 'ML', label: 'Mali (+223)' },
  { code: 'TG', label: 'Togo (+228)' },
  { code: 'BJ', label: 'Bénin (+229)' },
  { code: 'CM', label: 'Cameroun (+237)' },
  { code: 'GN', label: 'Guinée (+224)' },
  { code: 'GH', label: 'Ghana (+233)' },
  { code: 'INTL', label: 'International (Carte Visa / Mastercard)' }
];

export const PublicPaymentLinkPage: React.FC<PublicPaymentLinkPageProps> = ({ linkId }) => {
  const [link, setLink] = useState<PaymentLinkDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [country, setCountry] = useState('BF');
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'card'>('mobile_money');

  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<{
    transactionId: string;
    provider: string;
    checkoutUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    async function loadLink() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/payment-links/${encodeURIComponent(linkId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success || !data.link) {
          if (active) setError(data.error || 'Ce lien de paiement est introuvable ou expiré.');
          return;
        }
        if (active) setLink(data.link);
      } catch {
        if (active) setError('Impossible de charger les informations de ce lien de paiement.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadLink();
    return () => {
      active = false;
    };
  }, [linkId]);

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      setPayError('Veuillez renseigner votre nom complet et votre numéro de téléphone.');
      return;
    }

    setIsPaying(true);
    setPayError(null);
    try {
      const res = await fetch(`/api/payment-links/${encodeURIComponent(link.id)}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          country,
          paymentMethod
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setPayError(data.error || 'Le routeur de paiement n’a pas pu initialiser la transaction.');
        return;
      }

      setPaymentResult({
        transactionId: data.transactionId,
        provider: data.provider || 'NANASWITCH_ROUTER',
        checkoutUrl: data.checkoutUrl || null
      });

      if (data.checkoutUrl && typeof window !== 'undefined') {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setPayError('Erreur réseau lors de la connexion au routeur de paiement.');
    } finally {
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#1E40AF] animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-800">Chargement du lien de paiement...</p>
          <p className="text-xs text-slate-500">Vérification du marchand et sécurisation via NanaSwitch.</p>
        </div>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-rose-200 shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-extrabold text-slate-900">Lien de paiement indisponible</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error || 'Ce lien n’existe pas ou a été désactivé par le marchand.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 py-8 px-4 flex items-center justify-center font-sans">
      <div className="max-w-lg w-full space-y-4">
        {/* En-tête Marchand Affilié */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#1E40AF] to-[#2563EB] px-6 py-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-blue-100 font-bold">
                    Paiement sécurisé vers le marchand
                  </p>
                  <h2 className="text-base font-black truncate">{link.merchant_name}</h2>
                  <p className="text-[11px] text-blue-100/90 truncate">{link.merchant_sector}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-[10px] font-bold shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                NanaSwitch
              </span>
            </div>
          </div>

          {/* Détails clairs du lien (Libellé, Description, Montant) */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/60 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Libellé</p>
                <h1 className="text-lg font-extrabold text-slate-900 leading-snug">{link.title}</h1>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Montant à régler</p>
                <p className="text-2xl font-black text-[#1E40AF] font-mono">
                  {Number(link.amount).toLocaleString('fr-FR')}{' '}
                  <span className="text-sm font-bold">{link.currency}</span>
                </p>
              </div>
            </div>

            {link.description && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{link.description}</p>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Référence lien : <code className="font-mono font-bold text-slate-700">{link.id}</code></span>
              <span>Marchand ID : <code className="font-mono text-slate-600">{link.merchant_id.slice(0, 8)}...</code></span>
            </div>
          </div>

          {/* Formulaire de règlement ou confirmation */}
          <div className="p-6">
            {paymentResult ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">Transaction initialisée avec le routeur</h3>
                  <p className="text-xs text-slate-600">
                    Paiement de <strong>{Number(link.amount).toLocaleString('fr-FR')} {link.currency}</strong> pour{' '}
                    <strong>{link.merchant_name}</strong> ({link.title}).
                  </p>
                </div>
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Référence transaction</span>
                    <span className="font-mono font-bold text-slate-900">{paymentResult.transactionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Passerelle / Routeur</span>
                    <span className="font-bold text-[#1E40AF]">{paymentResult.provider}</span>
                  </div>
                </div>
                {paymentResult.checkoutUrl && (
                  <a
                    href={paymentResult.checkoutUrl}
                    className="w-full py-3.5 px-5 rounded-xl bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-md transition"
                  >
                    <span>Continuer vers la page de paiement opérateur</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ) : (
              <form onSubmit={handlePaySubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Moyen de paiement</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mobile_money')}
                      className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        paymentMethod === 'mobile_money'
                          ? 'bg-blue-50 border-[#1E40AF] text-[#1E40AF]'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Mobile Money</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        paymentMethod === 'card'
                          ? 'bg-blue-50 border-[#1E40AF] text-[#1E40AF]'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Carte Bancaire</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pays</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:border-[#1E40AF]"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nom complet *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Aminata Ouédraogo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Numéro de téléphone (Mobile Money / WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: +226 70 00 00 00"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email (optionnel, pour le reçu)</label>
                  <input
                    type="email"
                    placeholder="client@exemple.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>

                {payError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{payError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPaying}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isPaying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connexion au routeur...</span>
                    </>
                  ) : (
                    <>
                      <span>Payer {Number(link.amount).toLocaleString('fr-FR')} {link.currency}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Paiement chiffré et routé par <strong>NanaSwitch Cloud</strong> directement vers {link.merchant_name}.</span>
        </p>
      </div>
    </div>
  );
};

export default PublicPaymentLinkPage;
