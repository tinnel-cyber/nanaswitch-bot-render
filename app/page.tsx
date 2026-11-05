import Link from "next/link";
import { 
  ShieldCheck, 
  UploadCloud, 
  LayoutDashboard, 
  PackageCheck, 
  ArrowRight, 
  Sparkles, 
  Database, 
  Crown, 
  Server,
  Lock,
  GraduationCap
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCachedPlatformKpis } from "@/lib/cache";

// Server Component asynchrone (Next.js App Router)
export default async function HomePage() {
  // Technique secrète 6 : Récupération ultra-rapide via cache en mémoire
  const { connected: supabaseConnected, orgCount } = await getCachedPlatformKpis();

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-[#070b14]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-600/30">
              N
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight">
                Nanasore<span className="text-blue-500">.</span>
              </span>
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Next.js App Router
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/client/dashboard"
              prefetch={false}
              className="text-xs font-semibold px-3 py-2 rounded-xl text-slate-300 hover:text-white transition"
            >
              Espace Client
            </Link>
            <Link
              href="/vendor/upload"
              prefetch={false}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 transition active:scale-95"
            >
              Upload R2
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Infrastructure Souveraine Cloudflare R2 & Supabase
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Plateforme Unifiée <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Nanasore OS
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Gérez vos encaissements souverains, vos livraisons numériques compressées en RAM et votre écosystème marchand avec 0 % de commission.
          </p>

          {/* Statut Backend Server */}
          <div className="mt-8 inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs font-medium">
            <span className={`w-2.5 h-2.5 rounded-full ${supabaseConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="text-slate-300">
              Supabase Backend : <strong className={supabaseConnected ? "text-emerald-400" : "text-amber-400"}>
                {supabaseConnected ? `Connecté (${orgCount} orgs)` : "Opérationnel (Mode Local / Fallback)"}
              </strong>
            </span>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Espace Client */}
          <Link
            href="/client/dashboard"
            prefetch={false}
            className="group p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-105 transition-transform">
                <PackageCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Espace Client & Commandes</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Retrouvez l'historique complet de vos produits achetés, e-books et cours avec liens de téléchargement sécurisés.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-blue-400 group-hover:text-blue-300">
              <span>Accéder à mon espace client</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 2. Upload R2 Académique & Marchand */}
          <Link
            href="/vendor/upload"
            prefetch={false}
            className="group p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Upload Vault R2</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Module unifié pour enseignants et marchands : compression ZIP zlib 9 à la volée en RAM et sauvegarde dans le coffre Cloudflare R2.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
              <span>Lancer le module d'upload</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 3. Control Plane Super Admin */}
          <Link
            href="/admin/dashboard"
            prefetch={false}
            className="group p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-105 transition-transform">
                <Crown className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Control Plane Super Admin</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Supervision stricte de la plateforme : marchands, santé système, gestion des tarifs et politiques RLS Supabase.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-amber-400 group-hover:text-amber-300">
              <span>Espace sécurisé Control Plane</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 bg-[#050810] text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Nanasore OS — Plateforme Souveraine. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Règles Supabase RLS & Cloudflare R2
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
