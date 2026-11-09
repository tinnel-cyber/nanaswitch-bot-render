"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, AlertTriangle, Loader2, ArrowRight } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Authentification et validation en cours...");

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      try {
        // 1. Vérification paramètre code (PKCE flow)
        const code = searchParams.get("code");
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (isMounted) {
            setStatus("success");
            setMessage("Session confirmée avec succès ! Redirection vers votre tableau de bord...");
            setTimeout(() => router.push("/dashboard"), 1200);
            return;
          }
        }

        // 2. Vérification token_hash (Email confirmation directe)
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type") as any;
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type || "email",
          });
          if (error) throw error;
          if (isMounted) {
            setStatus("success");
            setMessage("Adresse e-mail confirmée avec succès ! Redirection...");
            setTimeout(() => router.push("/dashboard"), 1200);
            return;
          }
        }

        // 3. Vérification des hash tokens (#access_token=...&refresh_token=...)
        if (typeof window !== "undefined" && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
            if (isMounted) {
              setStatus("success");
              setMessage("Connexion établie avec succès ! Redirection...");
              setTimeout(() => router.push("/dashboard"), 1200);
              return;
            }
          }
        }

        // 4. Session déjà active dans Supabase
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          if (isMounted) {
            setStatus("success");
            setMessage("Session active détectée. Redirection...");
            setTimeout(() => router.push("/dashboard"), 1000);
            return;
          }
        }

        // 5. Repli : si aucun paramètre, redirection immédiate vers le dashboard
        if (isMounted) {
          setStatus("success");
          setMessage("Redirection vers votre tableau de bord...");
          setTimeout(() => router.push("/dashboard"), 800);
        }
      } catch (err: any) {
        console.error("[AUTH_CALLBACK_ERROR]", err);
        if (isMounted) {
          setStatus("error");
          setMessage(err?.message || "Échec de validation du jeton d'authentification.");
        }
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
            status === "success"
              ? "from-emerald-500 via-teal-400 to-emerald-600"
              : status === "error"
              ? "from-rose-600 via-red-500 to-amber-500"
              : "from-blue-600 via-indigo-500 to-blue-400 animate-pulse"
          }`}
        />

        {status === "loading" && (
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-lg font-black text-white">Validation en cours</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-white">Authentification réussie</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30"
              >
                <span>Accéder au Tableau de Bord</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-white">Erreur de confirmation</h2>
            <p className="text-xs text-rose-300/90 leading-relaxed">{message}</p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Tableau de Bord
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
              >
                Connexion
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070b14] flex items-center justify-center text-white text-xs">Chargement...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
