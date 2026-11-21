import React, { useEffect, useRef, useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { updateUserPassword } from '../../services/supabaseAuthService';

interface ResetPasswordPageProps {
  onSuccess?: () => void;
  onGoToLogin?: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onSuccess,
  onGoToLogin,
}) => {
  const [stage, setStage] = useState<'verifying' | 'form' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hasInitRef = useRef(false);

  useEffect(() => {
    if (hasInitRef.current) return;
    hasInitRef.current = true;

    const initRecoverySession = async () => {
      try {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));

        const urlErr =
          params.get('error_description') ||
          params.get('error') ||
          hashParams.get('error_description') ||
          hashParams.get('error');
        if (urlErr) {
          setErrorMsg(decodeURIComponent(urlErr));
          setStage('error');
          return;
        }

        const tokenHash = params.get('token_hash');
        const code = params.get('code');

        // 1. Flux cross-device par token_hash (?token_hash=...&type=recovery)
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (error) {
            const { data: existing } = await supabase.auth.getSession();
            if (!existing?.session) {
              setErrorMsg(error.message || 'Ce lien de réinitialisation est invalide ou a expiré.');
              setStage('error');
              return;
            }
          }
          setStage('form');
          return;
        }

        // 2. Flux PKCE par code (?code=...)
        if (code) {
          const { data: pre } = await supabase.auth.getSession();
          if (!pre?.session) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              const { data: retry } = await supabase.auth.getSession();
              if (!retry?.session) {
                setErrorMsg(
                  error.message?.includes('code verifier')
                    ? 'Ce lien a été ouvert sur un autre appareil. Veuillez redemander un lien de réinitialisation.'
                    : (error.message || 'Lien de réinitialisation invalide ou expiré.')
                );
                setStage('error');
                return;
              }
            }
          }
          setStage('form');
          return;
        }

        // 3. Flux implicite (#access_token=...&type=recovery) ou session déjà hydratée
        const { data: sessData } = await supabase.auth.getSession();
        if (sessData?.session) {
          setStage('form');
          return;
        }

        // Petite attente pour laisser detectSessionInUrl traiter le hash si présent
        if (hashParams.get('access_token')) {
          await new Promise((r) => setTimeout(r, 600));
          const { data: retrySess } = await supabase.auth.getSession();
          if (retrySess?.session) {
            setStage('form');
            return;
          }
        }

        setErrorMsg('Aucune session de réinitialisation détectée. Veuillez cliquer sur "Mot de passe oublié" pour recevoir un nouveau lien.');
        setStage('error');
      } catch (err: any) {
        setErrorMsg(err?.message || 'Erreur lors de la vérification du lien.');
        setStage('error');
      }
    };

    initRecoverySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      await updateUserPassword(newPassword);
      setStage('success');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.replace('/dashboard');
        }
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Impossible de mettre à jour le mot de passe.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-blue-50 text-blue-600">
            {stage === 'verifying' && <Loader2 className="w-7 h-7 animate-spin" />}
            {stage === 'form' && <Lock className="w-7 h-7" />}
            {stage === 'success' && <CheckCircle2 className="w-7 h-7 text-emerald-600" />}
            {stage === 'error' && <AlertTriangle className="w-7 h-7 text-amber-600" />}
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            Sécurité Nanasore
          </div>
          <h1 className="text-xl font-black text-slate-900">
            {stage === 'verifying' && 'Vérification du lien...'}
            {stage === 'form' && 'Nouveau mot de passe'}
            {stage === 'success' && 'Mot de passe mis à jour !'}
            {stage === 'error' && 'Lien invalide ou expiré'}
          </h1>
        </div>

        {stage === 'verifying' && (
          <p className="text-sm text-slate-600 text-center">
            Validation de votre session de réinitialisation sécurisée en cours...
          </p>
        )}

        {stage === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-500 text-center">
              Choisissez un nouveau mot de passe d'au moins 6 caractères pour sécuriser votre compte.
            </p>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Minimum 6 caractères"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 font-semibold text-sm focus:outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Confirmer le mot de passe
              </label>
              <input
                type={showPwd ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Répétez le nouveau mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 font-semibold text-sm focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm px-5 py-3.5 rounded-xl transition cursor-pointer shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <span>Enregistrer le nouveau mot de passe</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {stage === 'success' && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center font-semibold">
            Votre mot de passe a été modifié avec succès ! Redirection vers votre tableau de bord...
          </p>
        )}

        {stage === 'error' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600">{errorMsg}</p>
            <button
              type="button"
              onClick={() => {
                if (onGoToLogin) onGoToLogin();
                else if (typeof window !== 'undefined') window.location.replace('/');
              }}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition cursor-pointer"
            >
              <span>Retour à la connexion</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
