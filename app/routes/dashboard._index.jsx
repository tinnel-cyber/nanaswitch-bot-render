/**
 * @file dashboard._index.jsx
 * @description Route Remix officielle /dashboard (Hub Central - Quartier Général)
 * Intègre la validation Supabase côté serveur et le forçage en Dark Mode.
 */

import React, { useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export function meta() {
  return [
    { title: "Tableau de Bord Central | Nanasore OS" },
    { name: "description", content: "Quartier Général, gestion des modules, boutiques et indicateurs financiers." },
  ];
}

export async function loader() {
  let supabaseStatus = {
    connected: false,
    count: 0,
    organizations: [],
    error: null,
  };

  try {
    const { supabase } = await import("../utils/supabase.server");
    const { data, error } = await supabase.from("organizations").select("*").limit(20);

    if (error) {
      supabaseStatus.error = error.message;
    } else {
      supabaseStatus.connected = true;
      supabaseStatus.count = data?.length || 0;
      supabaseStatus.organizations = data || [];
    }
  } catch (err) {
    supabaseStatus.error = err instanceof Error ? err.message : "Erreur connexion Supabase";
  }

  return json({ supabaseStatus });
}

export default function DashboardIndexRoute() {
  const { supabaseStatus } = useLoaderData() || {};

  useEffect(() => {
    // Forcer le dark mode
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("dark", "theme-dark");
      document.documentElement.classList.remove("theme-light");
    }

    // Si exécuté dans l'environnement SPA unifié, assure le rendu du Hub Central
    if (typeof window !== "undefined") {
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Barre de Statut Supabase intégrée au Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg gap-3">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${supabaseStatus?.connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <div>
              <p className="text-sm font-semibold text-white">
                Statut Supabase :{" "}
                <span className={supabaseStatus?.connected ? "text-emerald-400" : "text-amber-400"}>
                  {supabaseStatus?.connected ? "Connecté et opérationnel" : "Non configuré ou hors-ligne"}
                </span>
              </p>
              <p className="text-xs text-slate-400">
                Table <code>organizations</code> :{" "}
                <span className="font-mono text-cyan-400">{supabaseStatus?.count ?? 0}</span> organisation(s) détectée(s)
              </p>
            </div>
          </div>
          <a
            href="/test-supabase"
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700 font-medium self-start sm:self-auto"
          >
            Diagnostics Supabase complets ↗
          </a>
        </div>
      </div>
    </div>
  );
}
