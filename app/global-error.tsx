"use client";

import { useEffect } from "react";
import { AlertOctagon, RefreshCw, Home, LifeBuoy } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CRITICAL GLOBAL ERROR]", error);
  }, [error]);

  return (
    <html lang="fr" className="theme-dark dark">
      <body className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-6 font-sans antialiased">
        <div className="max-w-lg w-full bg-slate-900/90 border border-red-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
          {/* Accent lumineux supérieur */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

          {/* Icône de sécurité */}
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-6 shadow-inner">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest inline-block mb-3">
            Anti-Crash Engine — Niveau Racine
          </span>

          <h1 className="text-2xl font-black text-white tracking-tight mb-2">
            Interception Critique Globale
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
            Une défaillance technique inattendue a été isolée au niveau de l'infrastructure racine. Vos sessions et données locales restent préservées.
          </p>

          {/* Détail d'erreur sécurisé */}
          <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 text-left font-mono text-[11px] text-slate-300 mb-6 break-all">
            <p className="text-red-400 font-bold mb-1">Erreur : {error.message || "Erreur système non spécifiée"}</p>
            {error.digest && (
              <p className="text-slate-500 text-[10px]">Identifiant Digest : {error.digest}</p>
            )}
          </div>

          {/* Actions de reprise */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => reset()}
              className="w-full flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Relancer l'application</span>
            </button>

            <a
              href="/"
              className="w-full sm:w-auto py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition border border-slate-700 flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Accueil</span>
            </a>
          </div>

          <p className="text-[11px] text-slate-500 mt-6 flex items-center justify-center gap-1.5">
            <LifeBuoy className="w-3.5 h-3.5 text-slate-400" />
            Support technique Nanasore : <a href="mailto:support@nanasore.com" className="text-blue-400 hover:underline">support@nanasore.com</a>
          </p>
        </div>
      </body>
    </html>
  );
}
