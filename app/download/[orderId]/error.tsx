"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Download, RefreshCw, AlertOctagon, ArrowLeft, LifeBuoy } from "lucide-react";

export default function DownloadOrderIdError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DOWNLOAD_PRESIGNED_URL_ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
      <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-md w-full shadow-xl text-center">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100">
          <AlertOctagon className="w-8 h-8 text-red-600" />
        </div>

        <span className="text-[11px] font-bold tracking-wider text-red-600 uppercase bg-red-50 px-2.5 py-1 rounded-md border border-red-100">
          Erreur de Génération du Lien R2
        </span>

        <h1 className="text-xl font-black text-gray-900 mt-3 mb-2">
          Impossible de préparer le téléchargement
        </h1>

        <p className="text-xs sm:text-sm text-gray-600 mb-6 leading-relaxed">
          La génération du lien signé Cloudflare R2 a échoué. Le fichier est sécurisé dans notre vault, veuillez réessayer de régénérer le jeton d'accès temporaire.
        </p>

        {error.message && (
          <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl mb-6 text-left font-mono text-xs text-red-700 break-all">
            {error.message}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold py-3.5 px-4 rounded-xl shadow-md shadow-blue-700/20 transition text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Régénérer le lien sécurisé</span>
          </button>

          <Link
            href="/client/dashboard"
            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-xl border border-gray-200 transition text-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retourner au tableau de bord client</span>
          </Link>
        </div>

        <p className="text-[11px] text-gray-400 mt-6 flex items-center justify-center gap-1.5">
          <LifeBuoy className="w-3.5 h-3.5 text-gray-400" />
          Besoin d'aide ? <a href="mailto:support@nanasore.com" className="text-blue-600 hover:underline">support@nanasore.com</a>
        </p>
      </div>
    </div>
  );
}
