import React, { useEffect, useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  ArrowLeft, 
  CheckCircle2, 
  AlertOctagon,
  RefreshCw
} from 'lucide-react';
import { 
  isSuperAdminLocally, 
  verifySuperAdminPrivileges 
} from '../../services/superAdminService';
import { auth } from '../../firebase';

export interface SuperAdminGuardProps {
  children: React.ReactNode;
  fallbackRedirectUrl?: string;
  onRedirect?: () => void;
  requiredRole?: 'super_admin' | 'founder';
}

/**
 * ============================================================================
 * SUPER ADMIN GUARD — CONTRÔLE D'ACCÈS DU CONTROL PLANE
 * ============================================================================
 * Garantit l'étanchéité absolue de l'espace Super Admin :
 * 1. Vérification des UIDs, emails et rôles autorisés (Table super_admins & whitelist).
 * 2. Rejet immédiat de tout marchand ou utilisateur standard.
 * 3. Redirection automatique vers l'espace marchand (/dashboard ou /pos).
 */
export const SuperAdminGuard: React.FC<SuperAdminGuardProps> = ({
  children,
  fallbackRedirectUrl = '/dashboard',
  onRedirect
}) => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => isSuperAdminLocally());
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let isCancelled = false;

    const checkPrivileges = async () => {
      // Vérification synchrone instantanée
      const initialLocal = isSuperAdminLocally();
      if (initialLocal) {
        if (!isCancelled) {
          setIsAuthorized(true);
          setIsVerifying(false);
        }
        return;
      }

      // Vérification asynchrone des privilèges Super Admin
      try {
        const hasRights = await verifySuperAdminPrivileges(auth.currentUser);
        if (!isCancelled) {
          setIsAuthorized(hasRights);
          setIsVerifying(false);
        }
      } catch (err) {
        console.warn('[SUPER_ADMIN_GUARD] Échec vérification des privilèges:', err);
        if (!isCancelled) {
          setIsAuthorized(false);
          setIsVerifying(false);
        }
      }
    };

    checkPrivileges();

    // Écoute des mises à jour des privilèges
    const handleStatusUpdate = (e: any) => {
      if (e?.detail?.isSuperAdmin) {
        setIsAuthorized(true);
        setIsVerifying(false);
      }
    };

    window.addEventListener('superAdminStatusVerified', handleStatusUpdate);
    return () => {
      isCancelled = true;
      window.removeEventListener('superAdminStatusVerified', handleStatusUpdate);
    };
  }, []);

  // Décompte de redirection automatique en cas d'accès non autorisé
  useEffect(() => {
    if (!isVerifying && !isAuthorized) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSafeRedirect();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isVerifying, isAuthorized]);

  const handleSafeRedirect = () => {
    if (onRedirect) {
      onRedirect();
    } else {
      window.history.pushState({}, '', fallbackRedirectUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // 1. Écran de vérification
  if (isVerifying) {
    return (
      <div className="min-h-screen w-full bg-[#030712] flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center animate-pulse">
            <Lock className="w-8 h-8 text-indigo-400" />
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 animate-ping" />
        </div>
        <h2 className="text-lg font-black tracking-wider uppercase text-slate-200 mb-2">
          Control Plane Security
        </h2>
        <p className="text-xs text-slate-400 max-w-sm text-center">
          Vérification cryptographique des privilèges Super Admin en cours...
        </p>
      </div>
    );
  }

  // 2. Interception en cas d'accès refusé (Marchand standard)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen w-full bg-[#020617] flex flex-col items-center justify-center p-6 text-slate-100 font-sans select-none">
        <div className="max-w-md w-full bg-slate-900/90 border border-red-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />

          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6 shadow-inner">
            <ShieldAlert className="w-10 h-10 text-red-400" />
          </div>

          <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest mb-3">
            Zone Réservée — Super Admin
          </span>

          <h2 className="text-xl font-black text-white tracking-tight mb-2">
            Accès Non Autorisé
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Cette section appartient exclusivement au <strong className="text-slate-200">Control Plane (Super Admin / Fondateur)</strong>. Les boutiques et marchands abonnés ne disposent pas des accréditations requises.
          </p>

          <div className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-6 text-left">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1">
              <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Redirection de sécurité</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Retour automatique vers votre espace marchand dans <span className="font-bold text-amber-400">{countdown}s</span>...
            </p>
          </div>

          <button
            onClick={handleSafeRedirect}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/20 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à mon Espace Marchand</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Utilisateur autorisé : Rendu du Control Plane
  return <>{children}</>;
};

export default SuperAdminGuard;
