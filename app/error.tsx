"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, ShieldCheck } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[APP_ROUTE_ERROR_INTERCEPTED]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center shadow-xl backdrop-blur-xl relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-5">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest inline-block mb-3">
          Isolation Incident
        </span>

        <h2 className="text-xl font-bold text-white mb-2">
          Incident temporaire détecté
        </h2>

        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          Une exception s'est produite lors de l'exécution de cette vue. Le reste de l'application demeure parfaitement stable et opérationnel.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réessayer l'opération</span>
          </button>

          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Revenir au Quartier Général</span>
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Protection Anti-Crash Nanasore active</span>
        </div>
      </div>
    </div>
  );
}
