"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Crown,
  ShieldCheck,
  Store,
  DollarSign,
  Activity,
  Users,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Server,
  Lock,
  ExternalLink,
  CheckCircle2
} from "lucide-react";

interface AdminDashboardClientProps {
  isSuperAdmin: boolean;
  userEmail?: string;
  totalStores: number;
  activeUsers: number;
  monthlyRevenueCFA: number;
}

export default function AdminDashboardClient({
  isSuperAdmin,
  userEmail,
  totalStores,
  activeUsers,
  monthlyRevenueCFA,
}: AdminDashboardClientProps) {
  const [selectedTab, setSelectedTab] = useState<"overview" | "users" | "security">("overview");

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-5">
            <Lock className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            Control Plane Cloisonné
          </span>
          <h2 className="text-xl font-bold mt-4 mb-2">Accès Super Admin Restreint</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Votre compte ({userEmail || "Non identifié"}) ne figure pas dans la table Supabase <code className="text-red-400 font-mono">super_admins</code> ni dans la liste des administrateurs autorisés.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            Retourner à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans pb-16">
      {/* Header Control Plane */}
      <header className="sticky top-0 z-40 bg-[#030712]/90 backdrop-blur-xl border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
            N
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base text-white tracking-tight">Nanasore Control Plane</span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-400" />
              Super Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-200 transition"
          >
            Quitter vers l'accueil
          </Link>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            {userEmail}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Control Plane Actif (Next.js App Router)
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Supervision Générale de la Plateforme
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Contrôle d'accès RLS Supabase actif, synchronisation Firebase UID et gestion des flux Cloudflare R2.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/vendor/upload"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center gap-1.5"
              >
                <Store className="w-4 h-4" />
                <span>Tester Upload R2</span>
              </Link>
            </div>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Marchands Actifs</span>
              <Store className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white">{totalStores}</div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Réseau marchand souverain</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Comptes Utilisateurs</span>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">{activeUsers}</div>
            <div className="text-[11px] text-blue-400 mt-1">Profils synchronisés Supabase</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Volume Mensuel</span>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">{monthlyRevenueCFA.toLocaleString("fr-FR")} FCFA</div>
            <div className="text-[11px] text-slate-400 mt-1">Encaissements souverains directs</div>
          </div>
        </div>

        {/* Détails Sécurité & RLS */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Statut des Règles de Sécurité & RLS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Table Supabase `super_admins`</p>
                <p className="text-slate-400 mt-0.5">
                  Politique RLS active : seuls les super admins déclarés peuvent consulter ou modifier les tables sensibles.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Stockage Cloudflare R2 Vault</p>
                <p className="text-slate-400 mt-0.5">
                  Compression zlib niveau 9 en RAM. Liens signés temporaires (expiration 3600 sec).
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
