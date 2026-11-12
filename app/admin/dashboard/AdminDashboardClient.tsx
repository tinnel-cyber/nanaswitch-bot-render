"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase, KNOWN_SUPERADMIN_EMAILS } from "@/lib/supabase";
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
  CheckCircle2,
  Tag,
  Check,
  X,
  Clock,
  LayoutDashboard,
  Layers
} from "lucide-react";

interface PendingAffiliate {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string;
  affiliateCode: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedItemTitle: string;
  payoutChannel: string;
  payoutDetails: string;
  tenantName: string;
  createdAt: string;
}

interface AdminDashboardClientProps {
  isSuperAdmin: boolean;
  userEmail?: string;
  totalStores: number;
  activeUsers: number;
  monthlyRevenueCFA: number;
  pendingAffiliates?: PendingAffiliate[];
}

export default function AdminDashboardClient({
  isSuperAdmin,
  userEmail,
  totalStores,
  activeUsers,
  monthlyRevenueCFA,
  pendingAffiliates = [],
}: AdminDashboardClientProps) {
  const [selectedTab, setSelectedTab] = useState<"overview" | "affiliates" | "security">("overview");
  const [affiliatesList, setAffiliatesList] = useState<PendingAffiliate[]>(pendingAffiliates);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean>(isSuperAdmin);
  const [displayEmail, setDisplayEmail] = useState<string | undefined>(userEmail);

  useEffect(() => {
    if (isSuperAdmin) {
      setAuthorized(true);
      return;
    }

    // Vérification côté client si le cookie SSR n'était pas encore synchronisé
    async function verifyClientSideSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setDisplayEmail(user.email);
          if (KNOWN_SUPERADMIN_EMAILS.includes(user.email.toLowerCase())) {
            setAuthorized(true);
          }
        }
      } catch (err) {
        console.warn("[AdminDashboardClient] Vérification client-side non bloquante:", err);
      }
    }

    verifyClientSideSession();
  }, [isSuperAdmin]);

  if (!authorized) {
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
            Votre compte ({displayEmail || userEmail || "Non identifié"}) ne figure pas dans la table Supabase <code className="text-red-400 font-mono">super_admins</code> ni dans la liste des administrateurs autorisés.
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

  async function handleDecision(affiliateId: string, decision: 'approved' | 'rejected') {
    setActionLoading(affiliateId);
    try {
      const res = await fetch('/api/admin/affiliates/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliate_id: affiliateId, decision }),
      });
      const data = await res.json();
      if (data.success) {
        setAffiliatesList((prev) =>
          prev.map((item) => (item.id === affiliateId ? { ...item, status: decision } : item))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  const pendingCount = affiliatesList.filter((a) => a.status === 'pending').length;

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
            href="/dashboard"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-md shadow-blue-600/20 active:scale-95"
            title="Accéder au Tableau de Bord Général"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Tableau de Bord Général</span>
          </Link>
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
                Contrôle central des validations d'affiliés pour les marchands standard, RLS Supabase et Cloudflare SaaS.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-900/30"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Tableau de Bord Marchand (/dashboard)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/hub"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold uppercase tracking-wider transition active:scale-95 flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Hub Central (27 Modules)</span>
              </Link>
              <button
                onClick={() => setSelectedTab(selectedTab === "affiliates" ? "overview" : "affiliates")}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center gap-1.5 shadow-lg shadow-emerald-900/30"
              >
                <Tag className="w-4 h-4" />
                <span>Affiliations Standard ({pendingCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section Spécifique : Validation des Affiliations Tenants Standard */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                Validation Centrale des Affiliés (Tenants Standard)
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                Demandes d'Affiliation pour les Boutiques & Cours Standard
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Règle appliquée : les demandes sur les boutiques Standard sont soumises à la validation Super Admin, tandis que les Whitelabel sont autonomes.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>En attente : <strong className="text-white">{pendingCount}</strong></span>
            </div>
          </div>

          {affiliatesList.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950/50 border border-dashed border-slate-800 text-center text-xs text-slate-500">
              Aucune demande d'affiliation standard en attente pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Affilié</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Boutique / Cours</th>
                    <th className="py-3 px-4">Paiement Wave/OM</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Action Super Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {affiliatesList.map((aff) => (
                    <tr key={aff.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{aff.fullName}</div>
                        <div className="text-[11px] text-slate-500">{aff.email} • {aff.whatsapp}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {aff.affiliateCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-white font-medium line-clamp-1">{aff.requestedItemTitle}</div>
                        <div className="text-[10px] text-slate-500">Tenant : {aff.tenantName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-300 font-semibold">{aff.payoutChannel}</div>
                        <div className="text-[10px] text-slate-500">{aff.payoutDetails}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {aff.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase">
                            En Attente
                          </span>
                        )}
                        {aff.status === 'approved' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                            Validé ✓
                          </span>
                        )}
                        {aff.status === 'rejected' && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase">
                            Refusé ✕
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {aff.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={actionLoading === aff.id}
                              onClick={() => handleDecision(aff.id, 'approved')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition shadow active:scale-95 disabled:opacity-50"
                            >
                              <Check className="w-3 h-3" /> Valider
                            </button>
                            <button
                              disabled={actionLoading === aff.id}
                              onClick={() => handleDecision(aff.id, 'rejected')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 transition shadow active:scale-95 disabled:opacity-50"
                            >
                              <X className="w-3 h-3" /> Rejeter
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Traité</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
      </main>
    </div>
  );
}
