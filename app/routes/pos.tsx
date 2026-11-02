/**
 * @file pos.tsx
 * @description Route Remix officielle /pos (Point de Vente & Caisse Enregistreuse)
 * Forcée en mode sombre (Dark Mode) natif.
 */

import React, { useEffect } from "react";

export function meta() {
  return [
    { title: "Point de Vente (POS) | Nanasore Caisse" },
    { name: "description", content: "Terminal de caisse enregistreuse ultra-rapide et gestion des ventes." },
  ];
}

export default function PosRoute() {
  useEffect(() => {
    // Forcer le dark mode sur le document HTML
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("dark", "theme-dark");
      document.documentElement.classList.remove("theme-light");
    }

    // Si exécuté dans l'environnement SPA unifié, assure le rendu de la caisse POS
    if (typeof window !== "undefined") {
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto text-2xl font-bold">
          POS
        </div>
        <h1 className="text-xl font-bold text-white">Terminal de Caisse Nanasore</h1>
        <p className="text-sm text-slate-400">
          Chargement du terminal de caisse enregistreuse en mode sombre haute performance...
        </p>
        <div className="pt-4">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              if (typeof window !== "undefined") {
                window.location.href = "/";
              }
            }}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition"
          >
            Accéder à la Caisse
          </a>
        </div>
      </div>
    </div>
  );
}
