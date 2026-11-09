"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Lock, CheckCircle2, AlertOctagon, ArrowRight, ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");
  const code = searchParams.get("code");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasValidToken, setHasValidToken] = useState(false);

  // Vérification initiale du jeton (Supabase PKCE code, hash tokens, ou oobCode Firebase)
  useEffect(() => {
    let isMounted = true;

    async function checkToken() {
      try {
        // 1. Supabase PKCE Code
        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (!exchangeErr && isMounted) {
            setHasValidToken(true);
            setIsVerifying(false);
            return;
          }
        }

        // 2. Supabase Hash Tokens (#access_token=...)
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error: setErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!setErr && isMounted) {
              setHasValidToken(true);
              setIsVerifying(false);
              return;
            }
          }
        }

        // 3. Session Supabase déjà active (ex: clic lien magique)
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session && isMounted) {
          setHasValidToken(true);
          setIsVerifying(false);
          return;
        }

        // 4. Firebase oobCode (Repli historique)
        if (oobCode && isMounted) {
          setHasValidToken(true);
          setIsVerifying(false);
          return;
        }

        if (isMounted) {
          setHasValidToken(false);
          setIsVerifying(false);
        }
      } catch (e) {
        if (isMounted) {
          setHasValidToken(false);
          setIsVerifying(false);
        }
      }
    }

    checkToken();

    return () => {
      isMounted = false;
    };
  }, [code, oobCode]);

  if (isVerifying) {
    return (
      <div className="text-center py-6 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
        <p className="text-xs text-slate-400">Vérification de votre lien de sécurité...</p>
      </div>
    );
  }

  if (!hasValidToken) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white">Lien de réinitialisation expiré ou invalide</h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Le jeton de sécurité est manquant ou a expiré. Veuillez redemander un lien de réinitialisation.
        </p>
        <Link
          href="/"
          className="inline-block w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30"
        >
          Retour à la connexion
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
      // 1. Mise à jour prioritaire via Supabase Auth
      const { error: supaErr } = await supabase.auth.updateUser({ password });
      if (!supaErr) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
        return;
      }

      // 2. Repli éventuel sur Firebase si oobCode présent
      if (oobCode) {
        try {
          const { confirmPasswordReset } = await import("firebase/auth");
          const { auth } = await import("@/lib/firebase-client");
          await confirmPasswordReset(auth, oobCode, password);
          setSuccess(true);
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
          return;
        } catch (fbErr: any) {
          throw supaErr || fbErr;
        }
      }

      throw supaErr;
    } catch (err: any) {
      console.error("[RESET_PASSWORD_ERROR]", err);
      setError(err?.message || "Erreur lors de la mise à jour du mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white">Mot de passe réinitialisé !</h1>
        <p className="text-xs text-slate-400">
          Votre mot de passe a été mis à jour avec succès. Redirection vers votre tableau de bord...
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30"
        >
          Accéder au Tableau de Bord
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white">Nouveau mot de passe</h1>
        <p className="text-xs text-slate-400 mt-1">
          Choisissez un mot de passe robuste d'au moins 6 caractères.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">
          Nouveau mot de passe
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">
          Confirmer le mot de passe
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Modification en cours...</span>
          </>
        ) : (
          <span>Enregistrer le nouveau mot de passe</span>
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <Suspense fallback={<div className="text-center text-xs text-slate-500 py-6">Chargement...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
