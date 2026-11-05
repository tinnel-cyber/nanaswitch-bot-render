"use client";

import { useEffect } from "react";
import Link from "next/link";
import { UploadCloud, RefreshCw, AlertOctagon, ArrowLeft, ShieldCheck } from "lucide-react";

export default function UploadModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[UPLOAD_VAULT_R2_ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center relative overflow-hidden">
        <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-blue-200 shadow-xs">
          <UploadCloud className="w-8 h-8 text-blue-700" />
        </div>

        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 uppercase tracking-wider inline-block">
          Vault R2 & Compression — Isolation Anti-Crash
        </span>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-3 mb-2">
          Échec du flux d'upload ou de compression
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
          Le processus de compression ZIP en RAM (niveau 9) ou le transfert vers Cloudflare R2 a rencontré une interruption. Le shell de l'application et vos paramètres restent protégés.
        </p>

        {/* Détail d'erreur formaté */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-6 text-left font-mono text-xs text-slate-700 break-all space-y-1">
          <p className="font-bold text-rose-700">Détail : {error.message || "Erreur de transfert R2"}</p>
          {error.digest && (
            <p className="text-slate-400 text-[10px]">Digest ID : {error.digest}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-blue-700/20 transition text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réinitialiser le formulaire</span>
          </button>

          <Link
            href="/client/dashboard"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3.5 px-4 rounded-xl transition text-xs flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Mes Téléchargements</span>
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Intégrité des données Cloudflare R2 préservée</span>
        </div>
      </div>
    </div>
  );
}
