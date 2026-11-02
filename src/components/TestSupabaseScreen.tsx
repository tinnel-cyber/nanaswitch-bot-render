import React, { useEffect, useState } from 'react';

interface Organization {
  id: string | number;
  name?: string;
  slug?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface ApiResponse {
  success: boolean;
  count?: number;
  organizations?: Organization[];
  error?: string;
  hint?: string | null;
  details?: string | null;
}

export default function TestSupabaseScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test-supabase');
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          `Le serveur a renvoyé une réponse non-JSON (Code HTTP ${res.status}). Pensez à relancer 'npm run dev' dans le terminal pour que Node.js charge le fichier .env et les nouvelles routes.`
        );
      }
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setData({
        success: false,
        error: err?.message || 'Erreur réseau lors de la requête vers /api/test-supabase',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Supabase Diagnostics
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Test de connexion Supabase
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Lecture de la table <code className="bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded font-mono">organizations</code> via <code className="text-cyan-400 font-mono">/api/test-supabase</code>
            </p>
          </div>
          <button
            onClick={fetchOrganizations}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            {loading ? 'Chargement...' : 'Rafraîchir'}
          </button>
        </div>

        {loading && (
          <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-400">
            <div className="inline-block w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium">Interrogation de Supabase en cours...</p>
          </div>
        )}

        {!loading && data?.error && (
          <div className="p-5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 space-y-2">
            <h2 className="font-semibold text-base flex items-center gap-2">
              ⚠️ Erreur de connexion Supabase
            </h2>
            <p className="font-mono text-sm bg-red-900/40 p-3 rounded border border-red-800/50 break-words">
              {data.error}
            </p>
            {data.hint && (
              <p className="text-xs text-red-300">
                <strong>Indice :</strong> {data.hint}
              </p>
            )}
            <p className="text-xs text-red-300/80 pt-2 border-t border-red-800/40">
              Vérifiez que <code className="text-white font-mono">SUPABASE_URL</code> et <code className="text-white font-mono">SUPABASE_ANON_KEY</code> sont bien configurés dans votre fichier <code className="text-white font-mono">.env</code> et que la table <code className="text-white font-mono">organizations</code> existe dans votre base Supabase.
            </p>
          </div>
        )}

        {!loading && data?.success && (!data.organizations || data.organizations.length === 0) && (
          <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
            <div className="text-3xl mb-2">🎉</div>
            <h3 className="text-lg font-semibold text-emerald-400">Connexion réussie !</h3>
            <p className="text-sm text-slate-400">
              La communication avec Supabase fonctionne parfaitement, mais la table <code className="text-amber-400">organizations</code> est actuellement vide.
            </p>
          </div>
        )}

        {!loading && data?.success && data.organizations && data.organizations.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-400 px-1">
              <span>{data.count} enregistrement(s) trouvé(s)</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Connexion Supabase active
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/90 text-xs uppercase tracking-wider text-slate-300 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Nom</th>
                    <th className="px-4 py-3 font-semibold">Slug</th>
                    <th className="px-4 py-3 font-semibold">Données complètes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 font-mono text-xs">
                  {data.organizations.map((org) => (
                    <tr key={String(org.id)} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 text-slate-300 font-medium">
                        {String(org.id)}
                      </td>
                      <td className="px-4 py-3 font-sans font-semibold text-white">
                        {org.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-sans">
                        {org.slug || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <pre className="max-w-md truncate text-xs text-slate-400 bg-slate-950/60 p-1.5 rounded">
                          {JSON.stringify(org)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
          <a href="/" className="hover:text-cyan-400 transition">← Retour à l'accueil</a>
          <a href="/api/test-supabase" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition font-mono">
            Voir le JSON brut (/api/test-supabase) ↗
          </a>
        </div>
      </div>
    </div>
  );
}
