"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Store, RefreshCw, AlertTriangle, ArrowLeft } from "lucide-react";

export default function VendorModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[VENDOR_MODULE_ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-lg text-center">
        <div className="w-16 h-16 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-200">
          <Store className="w-8 h-8 text-amber-600" />
        </div>

        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
          Espace Marchand — Sécurité Active
        </span>

        <h2 className="text-xl font-black text-slate-900 mt-3 mb-2">
          Interruption du Module Marchand
        </h2>

        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Une anomalie s'est produite lors de l'initialisation de vos outils marchands. L'erreur a été isolée pour protéger le reste de votre boutique.
        </p>

        {error.message && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-left font-mono text-[11px] text-slate-600 break-all">
            Détail : {error.message}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md shadow-blue-700/20 transition text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réinitialiser le module</span>
          </button>

          <Link
            href="/"
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl transition text-xs flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quartier Général Marchand</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
