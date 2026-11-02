import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import React, { useEffect } from "react";
import { supabase } from "../utils/supabase.server";

export interface Organization {
  id: string | number;
  name?: string;
  slug?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface LoaderData {
  organizations: Organization[] | null;
  error: string | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .limit(50);

    if (error) {
      return json<LoaderData>({
        organizations: null,
        error: error.message,
      });
    }

    return json<LoaderData>({
      organizations: data as Organization[],
      error: null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inattendue";
    return json<LoaderData>({
      organizations: null,
      error: message,
    });
  }
}

export default function TestSupabaseRoute() {
  const { organizations, error } = useLoaderData<typeof loader>();

  useEffect(() => {
    // Forcer le mode sombre et éliminer tout thème clair résiduel
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("dark", "theme-dark");
      document.documentElement.classList.remove("theme-light");
      document.body.classList.add("theme-dark");
      document.body.classList.remove("theme-light");
    }
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 999999,
        backgroundColor: "#060B18",
        color: "#f8fafc",
        overflowY: "auto",
        padding: "2rem",
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Supabase Diagnostics (Serveur)
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Test de connexion Supabase
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Lecture de la table <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-400 font-mono">organizations</code>
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              ← Tableau de Bord
            </a>
            <a
              href="/pos"
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition"
            >
              Terminal POS →
            </a>
          </div>
        </header>

        {error && (
          <div className="p-4 rounded-lg bg-red-950/70 border border-red-700/60 text-red-200">
            <h2 className="font-semibold mb-1">Erreur de lecture Supabase :</h2>
            <p className="text-sm font-mono break-words">{error}</p>
          </div>
        )}

        {!error && (!organizations || organizations.length === 0) && (
          <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 text-center text-slate-400">
            <p className="text-base font-medium text-emerald-400">✓ Connexion réussie à Supabase</p>
            <p className="text-sm mt-1 text-slate-400">
              La table <code>organizations</code> est connectée mais ne contient aucun enregistrement pour le moment.
            </p>
          </div>
        )}

        {organizations && organizations.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>{organizations.length} organisation(s) trouvée(s)</span>
              <span className="text-emerald-400 font-medium">✓ Connecté à Supabase</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/80 text-xs uppercase text-slate-300">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Nom</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Détails bruts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-xs">
                  {organizations.map((org) => (
                    <tr key={String(org.id)} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        {String(org.id)}
                      </td>
                      <td className="px-4 py-3 font-sans font-semibold text-white">
                        {org.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {org.slug || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        <pre className="max-w-xs truncate">{JSON.stringify(org)}</pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
