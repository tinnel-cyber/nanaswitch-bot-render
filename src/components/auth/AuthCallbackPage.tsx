import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { handleSupabaseAuthCallback, SupabaseAuthUser } from '../../services/supabaseAuthService';

interface AuthCallbackPageProps {
  onSuccess?: (user: SupabaseAuthUser) => void;
  onGoToLogin?: () => void;
}

export const AuthCallbackPage: React.FC<AuthCallbackPageProps> = ({
  onSuccess,
  onGoToLogin,
}) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Validation sécurisée de votre compte Supabase en cours...');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const result = await handleSupabaseAuthCallback();
      if (cancelled) return;

      if (result.success && result.user) {
        setStatus('success');
        setMessage('Votre adresse e-mail et votre session ont été vérifiées avec succès ! Redirection vers votre tableau de bord...');
        if (onSuccess) {
          onSuccess(result.user);
        }
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            if (result.type === 'recovery') {
              window.location.replace('/auth/reset-password');
            } else {
              window.location.replace('/dashboard?verified=true');
            }
          }
        }, 900);
      } else {
        setStatus('error');
        setMessage(result.error || 'Ce lien de confirmation est invalide ou a expiré.');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [onSuccess]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center bg-blue-50 text-blue-600">
          {status === 'loading' && <Loader2 className="w-8 h-8 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-8 h-8 text-emerald-600" />}
          {status === 'error' && <AlertTriangle className="w-8 h-8 text-amber-600" />}
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            Authentification Nanasore
          </div>
          <h1 className="text-xl font-black text-slate-900">
            {status === 'loading' && 'Vérification en cours...'}
            {status === 'success' && 'Compte confirmé !'}
            {status === 'error' && 'Lien invalide ou expiré'}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>

        {status === 'error' && (
          <div className="pt-2 flex flex-col gap-2">
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

export default AuthCallbackPage;
