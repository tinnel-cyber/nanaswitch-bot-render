import React, { useEffect, useState } from 'react';
import {
  Smartphone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Store,
  Sparkles,
  ExternalLink,
  LogIn,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NfcTagInfo {
  code: string;
  batch_name?: string;
  status: 'UNCLAIMED' | 'ACTIVE' | 'DISABLED';
  merchant_id?: string;
  merchant_name?: string;
  target_type?: string;
  target_slug?: string;
  target_url?: string;
  scan_count?: number;
}

interface PublicNfcTagPageProps {
  code: string;
  onBack?: () => void;
}

export const PublicNfcTagPage: React.FC<PublicNfcTagPageProps> = ({ code }) => {
  const cleanCode = decodeURIComponent(code || '').trim().toUpperCase();
  const [tag, setTag] = useState<NfcTagInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirectingUrl, setRedirectingUrl] = useState<string | null>(null);

  // Activation state (for UNCLAIMED tags)
  const [accessToken, setAccessToken] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [universes, setUniverses] = useState<{ id: string; name: string; sector?: string }[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('');
  const [targetType, setTargetType] = useState<'minimarket' | 'store' | 'custom_url'>('minimarket');
  const [targetSlug, setTargetSlug] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activatedTag, setActivatedTag] = useState<NfcTagInfo | null>(null);

  useEffect(() => {
    let active = true;
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/nfc/${encodeURIComponent(cleanCode)}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success || !json.tag) {
          if (active) setError(json.error || `Plaque NFC "${cleanCode}" introuvable dans le registre Nanasore.`);
          return;
        }
        const resolved: NfcTagInfo = json.tag;
        if (active) setTag(resolved);

        // Si la plaque est déjà activée → déclencher CAPI Retargeting Physique + redirection immédiate !
        if (resolved.status === 'ACTIVE' && resolved.target_url) {
          if (active) setRedirectingUrl(resolved.target_url);
          try {
            fetch('/api/tracking/capi-event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              keepalive: true,
              body: JSON.stringify({
                eventName: 'ViewContent',
                source: 'physical_pos_nfc',
                merchantId: resolved.merchant_id || '',
                nfcCode: resolved.code,
                slug: resolved.target_slug || '',
                pageUrl: typeof window !== 'undefined' ? window.location.href : ''
              })
            }).catch(() => {});
          } catch {}
          if (typeof window !== 'undefined') {
            window.location.replace(resolved.target_url);
          }
          return;
        }

        // Si la plaque est VIERGE (UNCLAIMED) → vérifier si le marchand est connecté pour activation 1-clic
        if (resolved.status === 'UNCLAIMED' && supabase) {
          const { data: sess } = await supabase.auth.getSession();
          const token = sess?.session?.access_token || '';
          const email = sess?.session?.user?.email || '';
          if (active) {
            setAccessToken(token);
            setUserEmail(email);
          }
          if (token) {
            const uRes = await fetch('/api/universes', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (uRes.ok) {
              const uJson = await uRes.json().catch(() => ({}));
              const list = Array.isArray(uJson.universes) ? uJson.universes : [];
              if (active) {
                setUniverses(list.map((u: any) => ({ id: String(u.id), name: String(u.name || 'Mon Univers'), sector: u.sector })));
                if (list[0]?.id) {
                  setSelectedMerchantId(String(list[0].id));
                }
              }
            }
          }
        }
      } catch {
        if (active) setError('Erreur réseau lors de la lecture de la plaque NFC.');
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [cleanCode]);

  const handleActivateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!selectedMerchantId) {
      setActivationError('Veuillez sélectionner votre univers marchand.');
      return;
    }
    if (targetType === 'custom_url' && !/^https?:\/\//i.test(customUrl.trim())) {
      setActivationError('Veuillez saisir une URL valide commençant par https://');
      return;
    }

    setIsActivating(true);
    setActivationError(null);
    try {
      const selectedUniv = universes.find((u) => u.id === selectedMerchantId);
      const res = await fetch(`/api/nfc/${encodeURIComponent(cleanCode)}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          merchantId: selectedMerchantId,
          merchantName: selectedUniv?.name || 'Boutique Nanasore',
          targetType,
          targetSlug: targetSlug.trim(),
          customUrl: customUrl.trim()
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.tag) {
        setActivationError(json.error || "Impossible d'activer cette plaque NFC.");
        return;
      }
      setActivatedTag(json.tag);
    } catch {
      setActivationError("Erreur réseau lors de l'activation.");
    } finally {
      setIsActivating(false);
    }
  };

  if (loading || redirectingUrl) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <h1 className="text-base font-black">
            {redirectingUrl ? 'Ouverture du Mini-Market...' : `Lecture de la plaque ${cleanCode}...`}
          </h1>
          <p className="text-xs text-slate-400">
            {redirectingUrl
              ? `Connexion instantanée vers ${tag?.merchant_name || 'la boutique'} via Nanasore NFC.`
              : 'Vérification de la puce sans contact Nanasore.'}
          </p>
          {redirectingUrl && (
            <a
              href={redirectingUrl}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:underline"
            >
              <span>Cliquez ici si la redirection ne démarre pas</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  if (error || !tag || tag.status === 'DISABLED') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-base font-black">Plaque NFC indisponible</h1>
          <p className="text-xs text-slate-400">
            {error || 'Cette plaque NFC a été désactivée par son administrateur.'}
          </p>
        </div>
      </div>
    );
  }

  if (activatedTag) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-emerald-500/40 rounded-3xl p-7 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
              Plaque {activatedTag.code} activée
            </span>
            <h1 className="text-xl font-black text-white">Votre plaque NFC Nanasore est prête !</h1>
            <p className="text-xs text-slate-300">
              Liée à <strong>{activatedTag.merchant_name}</strong>. Chaque client qui approche son téléphone ouvrira directement votre destination.
            </p>
          </div>
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3.5 text-left text-[11px] font-mono text-emerald-400 break-all">
            {activatedTag.target_url}
          </div>
          {activatedTag.target_url && (
            <a
              href={activatedTag.target_url}
              className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs inline-flex items-center justify-center gap-2 shadow-lg transition"
            >
              <span>Tester ma plaque maintenant</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    );
  }

  // Plaque VIERGE (UNCLAIMED) → Écran d'activation 1-clic pour le marchand
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 text-white flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-emerald-600 p-6 text-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[10px] font-black uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5" />
              Plaque Officielle Nanasore
            </span>
            <span className="font-mono text-xs font-black bg-black/25 px-2.5 py-1 rounded-lg">{tag.code}</span>
          </div>
          <h1 className="text-xl font-black leading-tight">Activer votre plaque NFC</h1>
          <p className="text-xs text-white/90">
            Associez cette plaque sans contact à votre univers marchand en 10 secondes. Vous pourrez modifier sa destination à tout moment.
          </p>
        </div>

        <div className="p-6">
          {!accessToken ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mx-auto">
                <Store className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connectez-vous à votre compte marchand Nanasore pour revendiquer et activer définitivement la plaque <strong>{tag.code}</strong>.
              </p>
              <a
                href={`/login?redirect=${encodeURIComponent(`/nfc/${tag.code}`)}`}
                className="w-full py-3.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs inline-flex items-center justify-center gap-2 shadow-lg transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Se connecter pour activer la plaque</span>
              </a>
            </div>
          ) : (
            <form onSubmit={handleActivateTag} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Compte connecté</span>
                <span className="font-bold text-emerald-400 truncate max-w-[200px]">{userEmail}</span>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">1. Choisissez votre Univers Marchand *</label>
                {universes.length === 0 ? (
                  <p className="text-amber-400 text-[11px] bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    Aucun univers trouvé sur ce compte. Créez d&apos;abord votre univers sur votre Dashboard Nanasore puis rescanez la plaque.
                  </p>
                ) : (
                  <select
                    value={selectedMerchantId}
                    onChange={(e) => setSelectedMerchantId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    {universes.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.sector ? `— ${u.sector}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">2. Destination au scan client *</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'minimarket', label: 'Mini-Market' },
                    { id: 'store', label: 'Boutique' },
                    { id: 'custom_url', label: 'Lien libre' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTargetType(opt.id as any)}
                      className={`py-2 px-2 rounded-xl border font-bold text-[11px] transition cursor-pointer ${
                        targetType === opt.id
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {targetType === 'minimarket' && (
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Slug du Tunnel Physique / Mini-Market (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: offre-boutique (laisser vide = par défaut)"
                    value={targetSlug}
                    onChange={(e) => setTargetSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {targetType === 'store' && (
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Slug de votre boutique (nsore.shop/...)</label>
                  <input
                    type="text"
                    placeholder="Ex: ma-boutique"
                    value={targetSlug}
                    onChange={(e) => setTargetSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {targetType === 'custom_url' && (
                <div>
                  <label className="font-bold text-slate-300 block mb-1">URL de destination (https://...) *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://nsore.shop/c/mon-offre?drawer=true&minimarket=true"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {activationError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{activationError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isActivating || universes.length === 0}
                className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activation en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Activer ma plaque NFC ({tag.code})</span>
                  </>
                )}
              </button>

              <p className="text-[10.5px] text-center text-slate-500 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Protégé par Nanasore — modifiable uniquement depuis votre compte.</span>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicNfcTagPage;
