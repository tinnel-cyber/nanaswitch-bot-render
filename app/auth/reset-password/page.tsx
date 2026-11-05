"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { Lock, CheckCircle2, AlertOctagon, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!oobCode) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white">Lien de réinitialisation invalide</h1>
        <p className="text-xs text-slate-400">
          Le jeton de sécurité est manquant. Veuillez redemander un lien de réinitialisation.
        </p>
        <Link
          href="/"
          className="inline-block w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
        >
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (err: any) {
      console.error("[RESET_PASSWORD_CONFIRM_ERROR]", err);
      if (err.code === "auth/expired-action-code") {
        setError("Ce lien de réinitialisation a expiré. Veuillez refaire une demande.");
      } else if (err.code === "auth/invalid-action-code") {
        setError("Ce lien a déjà été utilisé ou est invalide.");
      } else {
        setError(err.message || "Erreur lors du changement de mot de passe.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Sécurité Mise à Jour
        </span>
        <h1 className="text-2xl font-black text-white">Mot de passe réinitialisé !</h1>
        <p className="text-xs text-slate-300">
          Votre nouveau mot de passe a été enregistré avec succès. Redirection vers votre espace...
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase"
        >
          <span>Accéder au tableau de bord</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-3">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-white">Nouveau Mot de Passe</h1>
        <p className="text-xs text-slate-400 mt-1">
          Choisissez un nouveau mot de passe sécurisé pour votre compte Nanasore.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-300 mb-1.5">
          Nouveau mot de passe *
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 caractères"
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-600 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-300 mb-1.5">
          Confirmer le nouveau mot de passe *
        </label>
        <input
          type={showPassword ? "text" : "password"}
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Retapez le mot de passe"
          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? "Enregistrement en cours..." : "Valider mon nouveau mot de passe"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <Suspense
          fallback={
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Chiffrement Firebase sécurisé</span>
        </div>
      </div>
    </div>
  );
}
