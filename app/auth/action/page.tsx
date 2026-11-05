"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import {
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Lock,
  MailCheck,
} from "lucide-react";

type ActionStatus = "loading" | "success" | "error" | "redirecting";

function AuthActionHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const [status, setStatus] = useState<ActionStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(4);

  useEffect(() => {
    if (!mode || !oobCode) {
      setStatus("error");
      setErrorMessage("Paramètres de validation manquants ou URL incomplète.");
      return;
    }

    // 1. Branche Réinitialisation de mot de passe -> redirection vers /auth/reset-password
    if (mode === "resetPassword") {
      setStatus("redirecting");
      router.push(`/auth/reset-password?oobCode=${encodeURIComponent(oobCode)}`);
      return;
    }

    // 2. Branche Validation d'adresse e-mail
    if (mode === "verifyEmail") {
      let isMounted = true;

      applyActionCode(auth, oobCode)
        .then(() => {
          if (!isMounted) return;
          setStatus("success");
          console.log("[FIREBASE_AUTH] E-mail vérifié avec succès via oobCode.");
        })
        .catch((err: any) => {
          if (!isMounted) return;
          setStatus("error");
          console.error("[FIREBASE_AUTH_ACTION_ERROR]", err);

          if (err.code === "auth/invalid-action-code") {
            setErrorMessage("Ce lien de confirmation a déjà été utilisé ou n'est plus valide.");
          } else if (err.code === "auth/expired-action-code") {
            setErrorMessage("Ce lien de confirmation a expiré. Veuillez demander un nouvel envoi.");
          } else {
            setErrorMessage(err.message || "Impossible de valider ce compte.");
          }
        });

      return () => {
        isMounted = false;
      };
    }

    // 3. Autres modes éventuels (ex: recoverEmail)
    setStatus("error");
    setErrorMessage(`Mode d'action "${mode}" non pris en charge directement.`);
  }, [mode, oobCode, router]);

  // Décompte de redirection automatique vers /dashboard en cas de succès
  useEffect(() => {
    if (status === "success") {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push("/dashboard");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
        {/* Liseré supérieur décoratif */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
            status === "success"
              ? "from-emerald-500 via-teal-400 to-emerald-600"
              : status === "error"
              ? "from-rose-600 via-red-500 to-amber-500"
              : "from-blue-600 via-indigo-500 to-blue-400 animate-pulse"
          }`}
        />

        {/* ÉTAT 1 : CHARGEMENT / EN COURS */}
        {status === "loading" && (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Vérification Cryptographique
            </span>

            <h1 className="text-xl font-bold text-white">Validation de votre compte...</h1>
            <p className="text-xs text-slate-400">
              Application du jeton sécurisé Firebase sur votre profil Nanasore.
            </p>
          </div>
        )}

        {/* ÉTAT 2 : REDIRECTION VERS RESET PASSWORD */}
        {status === "redirecting" && (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
              <Lock className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>

            <h1 className="text-xl font-bold text-white">Redirection en cours...</h1>
            <p className="text-xs text-slate-400">
              Ouverture de l'écran de réinitialisation de votre mot de passe.
            </p>
          </div>
        )}

        {/* ÉTAT 3 : SUCCÈS CONFIRMATION E-MAIL */}
        {status === "success" && (
          <div className="py-2 space-y-5">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <MailCheck className="w-10 h-10 text-emerald-400" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Compte Nanasore Activé
            </span>

            <h1 className="text-2xl font-black text-white tracking-tight">
              Adresse e-mail confirmée !
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Félicitations, votre compte est désormais actif et sécurisé. Vos modules marchands et votre coffre numérique Cloudflare R2 sont débloqués.
            </p>

            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-[11px] text-slate-400">
              Redirection automatique vers votre tableau de bord dans{" "}
              <strong className="text-emerald-400 font-bold">{countdown}s</strong>...
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Accéder à mon tableau de bord</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ÉTAT 4 : ERREUR / EXPIRÉ */}
        {status === "error" && (
          <div className="py-2 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Échec de la validation
            </span>

            <h1 className="text-xl font-bold text-white tracking-tight">
              Lien expiré ou non valide
            </h1>

            <p className="text-xs text-slate-400 leading-relaxed">
              {errorMessage}
            </p>

            <div className="flex flex-col gap-3 pt-2">
              <Link
                href="/dashboard"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <span>Accéder à l'espace Nanasore</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/"
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Retour à l'accueil
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Protection cryptographique Firebase & Nanasore</span>
        </div>
      </div>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-6">
          <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <AuthActionHandler />
    </Suspense>
  );
}
