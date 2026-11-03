/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NaNaSwitch Cloud — Garde-Frontière Zero-Trust (NaNaSwitchAuthGuard)
 * Routeur & SaaS Cloud Intelligent d'API
 * 
 * Rôles & Sécurité :
 * 1. Vérifie si une session Firebase Auth existe.
 * 2. Vérifie si le compte possède un document isolé dans `switch_accounts/{uid}`.
 * 3. Si aucun compte switch_accounts/{uid} n'existe (ex: commerçant d'une boutique Nanasore standard),
 *    bloque l'accès et redirige vers /nana-switch/auth avec le message d'isolation.
 * 4. Fournit le SwitchAccountContext pour alimenter la Sidebar, l'Identité d'Organisation et le Tenant ID.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth, db } from '../../../firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Zap, ShieldCheck, Lock, Loader2, ArrowRight } from 'lucide-react';
import { playTapBeep } from '../../../utils/audio';
import { NaNaSwitchLogo } from './NaNaSwitchLogo';

export interface SwitchAccountData {
  uid: string;
  email: string;
  organizationName: string;
  contactName: string;
  whatsapp: string;
  profileType: 'developer' | 'business' | 'agency';
  country: string;
  switchTenantId: string; // ex: 'sw_' + uid.slice(0, 10)
  accountType: 'nana_switch_cloud_only' | 'nana_switch_linked';
  role: 'owner' | 'admin' | 'developer';
  pinHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SwitchAccountContextValue {
  user: FirebaseUser | null;
  switchAccount: SwitchAccountData | null;
  loading: boolean;
  error: string | null;
  refreshSwitchAccount: () => Promise<void>;
  signOutSwitch: () => Promise<void>;
}

const SwitchAccountContext = createContext<SwitchAccountContextValue | undefined>(undefined);

export const useSwitchAccount = (): SwitchAccountContextValue => {
  const context = useContext(SwitchAccountContext);
  if (!context) {
    return {
      user: auth.currentUser,
      switchAccount: null,
      loading: false,
      error: null,
      refreshSwitchAccount: async () => {},
      signOutSwitch: async () => {
        try {
          await firebaseSignOut(auth);
        } catch (e) {
          console.warn(e);
        }
        if (typeof window !== 'undefined') {
          window.location.href = '/nana-switch/auth';
        }
      }
    };
  }
  return context;
};

export interface NaNaSwitchAuthGuardProps {
  children: React.ReactNode;
  onNavigate?: (path: string) => void;
}

export const NaNaSwitchAuthGuard: React.FC<NaNaSwitchAuthGuardProps> = ({
  children,
  onNavigate
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [switchAccount, setSwitchAccount] = useState<SwitchAccountData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction de rechargement du document d'organisation
  const fetchSwitchAccount = useCallback(async (uid: string) => {
    try {
      const docRef = doc(db, 'switch_accounts', uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as SwitchAccountData;
        setSwitchAccount(data);
        return data;
      }
      setSwitchAccount(null);
      return null;
    } catch (err: any) {
      console.warn('[NANA_SWITCH_GUARD] Erreur lecture switch_accounts :', err);
      setError(err?.message || 'Erreur d\'accès au profil Cloud');
      return null;
    }
  }, []);

  const refreshSwitchAccount = useCallback(async () => {
    if (auth.currentUser) {
      await fetchSwitchAccount(auth.currentUser.uid);
    }
  }, [fetchSwitchAccount]);

  // Déconnexion Cloud dédiée (ramène vers /nana-switch/auth)
  const signOutSwitch = useCallback(async () => {
    playTapBeep();
    try {
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setSwitchAccount(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('nanaswitch_auth_notice');
      }
      if (onNavigate) {
        onNavigate('/nana-switch/auth');
      } else if (typeof window !== 'undefined') {
        window.location.href = '/nana-switch/auth';
      }
    } catch (err) {
      console.error('[NANA_SWITCH_GUARD] Erreur signOut :', err);
    }
  }, [onNavigate]);

  // Surveillance Firebase Auth & Validation du document switch_accounts/{uid}
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setSwitchAccount(null);
        setLoading(false);
        // Redirection vers /nana-switch/auth
        if (onNavigate) {
          onNavigate('/nana-switch/auth');
        } else if (typeof window !== 'undefined') {
          window.location.href = '/nana-switch/auth';
        }
        return;
      }

      // L'utilisateur est connecté dans Firebase Auth, vérifions son compte d'organisation Cloud
      const accountData = await fetchSwitchAccount(user.uid);
      setLoading(false);

      if (!accountData) {
        // L'utilisateur est connecté à Firebase (ex: boutique Nanasore) mais n'a pas de compte d'organisation Cloud
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            'nanaswitch_auth_notice',
            '🛡️ Espace Cloud Isolé : Veuillez créer ou activer votre compte d\'organisation NaNaSwitch Cloud indépendant pour accéder au Routeur API.'
          );
        }
        if (onNavigate) {
          onNavigate('/nana-switch/auth');
        } else if (typeof window !== 'undefined') {
          window.location.href = '/nana-switch/auth';
        }
      }
    });

    return () => unsubscribe();
  }, [fetchSwitchAccount, onNavigate]);

  // Valeur mémorisée du contexte
  const contextValue = useMemo<SwitchAccountContextValue>(() => ({
    user: firebaseUser,
    switchAccount,
    loading,
    error,
    refreshSwitchAccount,
    signOutSwitch
  }), [firebaseUser, switchAccount, loading, error, refreshSwitchAccount, signOutSwitch]);

  // =========================================================================
  // 2. ÉCRAN DE CHARGEMENT ZERO-TRUST
  // =========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border-2 border-blue-600 animate-fadeIn">
          <div className="relative flex flex-col items-center justify-center">
            <NaNaSwitchLogo variant="full" size="md" theme="light" layout="vertical" />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Vérification des Accès Zero-Trust
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Contrôle du jeton d'organisation et isolation de la passerelle...
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Chiffrement AES-256 Actif</span>
          </div>
        </div>
      </div>
    );
  }

  // Si non authentifié ou sans compte d'organisation Cloud, ne rien rendre (la redirection est déclenchée)
  if (!firebaseUser || !switchAccount) {
    return null;
  }

  // =========================================================================
  // 3. RENDU DES PAGES PROTÉGÉES DANS LE CONTEXTE
  // =========================================================================

  return (
    <SwitchAccountContext.Provider value={contextValue}>
      {children}
    </SwitchAccountContext.Provider>
  );
};

export default NaNaSwitchAuthGuard;
