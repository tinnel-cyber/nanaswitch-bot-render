"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShoppingBag, RefreshCw, AlertCircle, ArrowLeft } from "lucide-react";

export default function ClientModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ESPACE_CLIENT_ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-lg text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-blue-100">
          <AlertCircle className="w-8 h-8 text-blue-700" />
        </div>

        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
          Espace Client — Isolation Module
        </span>

        <h2 className="text-xl font-black text-slate-900 mt-3 mb-2">
          Chargement des commandes interrompu
        </h2>

        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Impossible de récupérer la liste de vos produits ou de synchroniser la session client. Votre compte et vos achats restent intacts.
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
            <span>Actualiser mes commandes</span>
          </button>

          <Link
            href="/"
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl transition text-xs flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'accueil Nanasore</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
