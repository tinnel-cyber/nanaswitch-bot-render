'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorDealPage({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-6 shadow-2xl">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
        Oups, impossible de charger l'offre du Deal
      </h2>

      <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
        {error?.message ||
          'Une erreur inattendue est survenue lors de la synchronisation de la page de vente physique.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Réessayer</span>
        </button>

        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Retour à l'accueil</span>
        </Link>
      </div>
    </div>
  )
}
