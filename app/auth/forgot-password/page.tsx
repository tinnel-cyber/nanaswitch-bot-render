"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthActionResult } from "@/app/actions/auth";
import { Mail, KeyRound, CheckCircle2, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setValidationError("Veuillez saisir une adresse e-mail valide.");
      return;
    }

    startTransition(async () => {
      const res = await requestPasswordReset({ email: cleanEmail });
      if (!res.success) {
        setValidationError(res.error || "Impossible d'envoyer le lien de réinitialisation.");
      } else {
        setResult(res);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Halos lumineux */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative z-10">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-500 mb-4 shadow-inner">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Mot de passe oublié</h1>
          <p className="text-slate-400 text-sm mt-1">
            Récupération sécurisée via le serveur Nanasore
          </p>
        </div>

        {/* Message de confirmation */}
        {result?.success ? (
          <div className="space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">E-mail expédié !</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {result.message || "Un e-mail officiel contenant votre lien sécurisé a été envoyé."}
              </p>
              <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-400">
                Expéditeur officiel : <span className="text-blue-400 font-semibold">contact@nanasore.com</span>
                <br />
                Vérifiez votre boîte de réception ou vos spams, puis cliquez sur le lien reçu.
              </div>
            </div>
            <div className="pt-2">
              <Link
                href="/auth/action"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg shadow-blue-600/30"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à l'authentification
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {(validationError || result?.error) && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{validationError || result?.error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Adresse e-mail enregistrée</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération du lien sécurisé...
                </>
              ) : (
                <>
                  Envoyer le lien de réinitialisation
                  <KeyRound className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
              <Link href="/auth/action" className="inline-flex items-center gap-1.5 text-blue-400 hover:underline font-semibold">
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
