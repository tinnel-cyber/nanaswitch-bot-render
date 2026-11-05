"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Crown, RefreshCw, AlertTriangle, ArrowLeft, ShieldAlert } from "lucide-react";

export default function AdminModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CONTROL_PLANE_ADMIN_ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-[75vh] bg-[#030712] text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-5">
          <ShieldAlert className="w-8 h-8 text-amber-400" />
        </div>

        <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 mb-3">
          <Crown className="w-3 h-3 text-amber-400" />
          Control Plane — Cloisonnement Actif
        </span>

        <h2 className="text-xl font-black text-white mb-2">
          Incident de Supervision Control Plane
        </h2>

        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          Une erreur est survenue lors de la vérification des privilèges Super Admin ou du chargement des indicateurs SQL Supabase. Le réseau marchand demeure opérationnel.
        </p>

        {error.message && (
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl mb-6 text-left font-mono text-[11px] text-amber-300 break-all">
            Détail : {error.message}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Relancer le Control Plane</span>
          </button>

          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retourner à l'accueil Nanasore</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
