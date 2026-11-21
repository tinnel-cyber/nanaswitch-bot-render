/**
 * @file supabaseAuthService.ts
 * @description Service Officiel d'Authentification Supabase (Email/Mot de passe, Google OAuth, Sessions)
 * Remplace définitivement Firebase Auth sur l'ensemble de la plateforme Nanasore.
 */

import { supabase } from '../lib/supabase';
import { StoreUser } from '../types';

export interface SupabaseAuthUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  fullName?: string;
  name?: string;
  emailVerified: boolean;
  providerData: Array<{ providerId: string }>;
  role?: string;
  sellerMode?: string;
}

/**
 * Récupère l'URL canonique de redirection OAuth
 */
function getAuthRedirectUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  return 'https://nanasore.com/auth/callback';
}

/**
 * Connexion avec Google OAuth via Supabase
 */
export async function signInWithGoogle(): Promise<SupabaseAuthUser | null> {
  const redirectUrl = getAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    console.error('[SUPABASE AUTH] Erreur connexion Google :', error.message);
    throw new Error(error.message || 'Échec de la connexion Google');
  }

  // Si une session est active immédiatement
  const { data: sessionData } = await supabase.auth.getSession();
  const u = sessionData?.session?.user;
  if (u) {
    const displayName = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Utilisateur';
    const authUser: SupabaseAuthUser = {
      id: u.id,
      uid: u.id,
      email: u.email || '',
      displayName,
      name: displayName,
      fullName: displayName,
      emailVerified: Boolean(u.confirmed_at || u.email_confirmed_at),
      providerData: [{ providerId: 'google' }],
      role: 'GERANT',
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nana_store_auth_user', JSON.stringify({
          ...authUser,
          plan: 'free',
        }));
        localStorage.setItem('nana_auth_token', sessionData.session?.access_token || '');
      } catch {}
    }

    return authUser;
  }

  return null;
}

/**
 * Connexion avec Email et Mot de passe via Supabase Auth
 */
export async function loginWithEmail(email: string, password: string): Promise<SupabaseAuthUser> {
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    console.warn('[SUPABASE AUTH] Erreur connexion email :', error.message);
    let msg = error.message;
    if (msg.includes('Invalid login credentials')) {
      msg = 'Adresse e-mail ou mot de passe incorrect.';
    } else if (msg.includes('Email not confirmed')) {
      msg = 'Veuillez confirmer votre adresse email avant de vous connecter.';
    }
    throw new Error(msg);
  }

  const u = data.user;
  if (!u) {
    throw new Error('Utilisateur non trouvé après authentification.');
  }

  const displayName = u.user_metadata?.full_name || u.user_metadata?.name || cleanEmail.split('@')[0];
  const authUser: SupabaseAuthUser = {
    id: u.id,
    uid: u.id,
    email: u.email || cleanEmail,
    displayName,
    name: displayName,
    fullName: displayName,
    emailVerified: Boolean(u.confirmed_at || u.email_confirmed_at),
    providerData: [{ providerId: 'password' }],
    role: u.user_metadata?.seller_mode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
    sellerMode: u.user_metadata?.seller_mode || 'merchant_ecommerce',
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('nana_store_auth_user', JSON.stringify({
        ...authUser,
        plan: 'free',
      }));
      localStorage.setItem('nana_auth_token', data.session?.access_token || '');
    } catch {}
  }

  return authUser;
}

/**
 * Création de compte avec Email et Mot de passe via Supabase Auth
 */
export async function registerWithEmail(
  email: string,
  password: string,
  fullName?: string,
  sellerMode: string = 'merchant_ecommerce'
): Promise<SupabaseAuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  const resolvedName = (fullName || cleanEmail.split('@')[0]).trim();
  const redirectUrl = getAuthRedirectUrl();

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        full_name: resolvedName,
        name: resolvedName,
        seller_mode: sellerMode,
      },
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) {
    console.warn('[SUPABASE AUTH] Inscription via GoTrue client notice :', error.message);
    if (error.message.includes('User already registered') || error.message.includes('already registered')) {
      throw new Error('Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.');
    }

    // Basculement direct et transparent vers Brevo pour délivrer l'e-mail de confirmation
    try {
      const serverRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          fullName: resolvedName,
          name: resolvedName,
          sellerMode
        })
      });
      const serverData = await serverRes.json();
      if (serverData.success) {
        return {
          id: serverData.userId || 'usr_' + Date.now(),
          uid: serverData.userId || 'usr_' + Date.now(),
          email: cleanEmail,
          displayName: resolvedName,
          name: resolvedName,
          fullName: resolvedName,
          emailVerified: false,
          providerData: [{ providerId: 'password' }],
          role: sellerMode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
          sellerMode
        };
      } else if (serverData.error) {
        throw new Error(serverData.error);
      }
    } catch (fallbackErr: any) {
      if (fallbackErr?.message && !fallbackErr.message.includes('fetch')) {
        throw fallbackErr;
      }
    }

    throw new Error("Impossible d'envoyer l'e-mail de confirmation. Veuillez vérifier votre adresse e-mail ou réessayer.");
  }

  const u = data.user;
  if (!u) {
    throw new Error("Échec de création du compte.");
  }

  const authUser: SupabaseAuthUser = {
    id: u.id,
    uid: u.id,
    email: u.email || cleanEmail,
    displayName: resolvedName,
    name: resolvedName,
    fullName: resolvedName,
    emailVerified: Boolean(u.confirmed_at || u.email_confirmed_at),
    providerData: [{ providerId: 'password' }],
    role: sellerMode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
    sellerMode,
  };

  // Synchronisation prioritaire immédiate dans la table Supabase `profiles`
  try {
    await supabase.from('profiles').upsert({
      id: u.id,
      email: cleanEmail,
      full_name: resolvedName,
      role: sellerMode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
      kyc_status: 'none',
      pricing_model: 'none',
      wallet_balance: 0,
      enabled_themes: [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (profErr) {
    console.warn('[SUPABASE AUTH] Sync profil notice:', profErr);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('nana_store_auth_user', JSON.stringify({
        ...authUser,
        plan: 'free',
      }));
      if (data.session?.access_token) {
        localStorage.setItem('nana_auth_token', data.session.access_token);
      }
    } catch {}
  }

  return authUser;
}

/**
 * Réinitialisation du mot de passe par e-mail via Supabase Auth & Brevo
 */
export async function resetPasswordEmail(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new Error('Adresse e-mail requise.');

  const redirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/reset-password`
    : 'https://nanasore.com/auth/reset-password';

  // 1. Déclenchement via Supabase Auth (qui achemine via le SMTP Brevo configuré dans Supabase)
  try {
    await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });
  } catch (supaErr) {
    console.warn('[SUPABASE AUTH RESET] Notice:', supaErr);
  }

  // 2. Déclenchement via API Brevo pour garantir l'envoi avec le template de marque officiel
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.error) throw new Error(data.error);
    }
  } catch (apiErr: any) {
    console.warn('[BREVO API RESET] Notice:', apiErr?.message);
  }
}

/**
 * Mise à jour sécurisée du mot de passe (après clic sur lien de réinitialisation)
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Le mot de passe doit comporter au moins 6 caractères.');
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw new Error(error.message || 'Impossible de mettre à jour le mot de passe.');
  }
}

/**
 * Renvoyer l'e-mail de confirmation via Supabase Auth & Brevo
 */
export async function resendVerificationEmail(emailTarget?: string): Promise<boolean> {
  try {
    let email = emailTarget;
    if (!email) {
      const { data: sessionData } = await supabase.auth.getSession();
      email = sessionData?.session?.user?.email || undefined;
    }
    if (!email && typeof window !== 'undefined') {
      const saved = localStorage.getItem('nana_store_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        email = parsed.email;
      }
    }
    if (!email) return false;

    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl = getAuthRedirectUrl();

    // 1. Envoi officiel unique via Supabase Auth (évite le double envoi qui invalide le premier jeton)
    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (!resendErr) {
      return true;
    }

    console.warn('[SUPABASE AUTH] resend fallback vers /api/auth/resend-verification :', resendErr.message);

    // 2. Repli serveur (Brevo + lien officiel token_hash cross-device) uniquement si Supabase Auth a refusé
    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Traite le callback officiel Supabase (/auth/callback) sur N'IMPORTE QUEL appareil :
 * 1. Flux cross-device par token_hash (?token_hash=...&type=signup|magiclink|email|recovery)
 * 2. Flux PKCE par code (?code=...)
 * 3. Flux implicite par hash (#access_token=...) via detectSessionInUrl
 */
export async function handleSupabaseAuthCallback(): Promise<{
  success: boolean;
  user?: SupabaseAuthUser;
  type?: string;
  error?: string;
}> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Environnement navigateur requis.' };
  }

  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));

    const urlError = params.get('error_description') || params.get('error') || hashParams.get('error_description') || hashParams.get('error');
    if (urlError) {
      return { success: false, error: decodeURIComponent(urlError) };
    }

    const tokenHash = params.get('token_hash');
    const rawType = (params.get('type') || 'signup') as 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change' | 'email';
    const code = params.get('code');

    let session: any = null;
    let supaUser: any = null;

    if (tokenHash) {
      // Flux cross-device officiel : fonctionne même si l'utilisateur ouvre le mail sur un autre appareil
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: rawType,
      });
      if (error) {
        return { success: false, error: error.message || 'Lien de confirmation invalide ou expiré.' };
      }
      session = data?.session || null;
      supaUser = data?.user || data?.session?.user || null;
    } else if (code) {
      // Flux PKCE
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return {
          success: false,
          error: error.message?.includes('code verifier')
            ? 'Ce lien a été ouvert sur un autre appareil. Veuillez demander un nouveau lien ou vous connecter avec votre mot de passe.'
            : (error.message || 'Échec de validation du code de session.'),
        };
      }
      session = data?.session || null;
      supaUser = data?.user || data?.session?.user || null;
    } else {
      // Flux implicite (#access_token=...) ou session déjà établie par detectSessionInUrl
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return { success: false, error: error.message };
      }
      session = data?.session || null;
      supaUser = data?.session?.user || null;
    }

    if (!supaUser) {
      const { data: userData } = await supabase.auth.getUser();
      supaUser = userData?.user || null;
    }

    if (!supaUser?.id) {
      return { success: false, error: 'Aucune session active détectée. Veuillez vous connecter.' };
    }

    const displayName =
      supaUser.user_metadata?.full_name ||
      supaUser.user_metadata?.name ||
      supaUser.email?.split('@')[0] ||
      'Utilisateur';

    const authUser: SupabaseAuthUser = {
      id: supaUser.id,
      uid: supaUser.id,
      email: supaUser.email || '',
      displayName,
      name: displayName,
      fullName: displayName,
      emailVerified: Boolean(supaUser.confirmed_at || supaUser.email_confirmed_at || true),
      providerData: [{ providerId: supaUser.app_metadata?.provider || 'email' }],
      role: supaUser.user_metadata?.seller_mode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
      sellerMode: supaUser.user_metadata?.seller_mode || 'merchant_ecommerce',
    };

    try {
      localStorage.setItem('nana_store_auth_user', JSON.stringify({
        ...authUser,
        plan: 'free',
      }));
      if (session?.access_token) {
        localStorage.setItem('nana_auth_token', session.access_token);
      }
    } catch {}

    // Synchroniser le profil Supabase avec le vrai UUID utilisateur
    try {
      await supabase.from('profiles').upsert({
        id: supaUser.id,
        email: authUser.email,
        full_name: displayName,
        role: authUser.role,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch {}

    return { success: true, user: authUser, type: rawType };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur lors de la validation du lien de confirmation.' };
  }
}

/**
 * Déconnexion Supabase Auth
 */
export async function logoutUser(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('[SUPABASE AUTH] SignOut notice:', e);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('nana_store_auth_user');
      localStorage.removeItem('nana_auth_token');
      localStorage.removeItem('nana_store_sub');
      localStorage.removeItem('nana_current_student');
      localStorage.removeItem('nana_merchant_universes');
      localStorage.removeItem('nana_all_universes');
      localStorage.removeItem('nana_merchant_universes_active');
      localStorage.removeItem('nana_kyc_submissions');
      localStorage.removeItem('nanaswitch_merchant_apps');
      localStorage.removeItem('nanaswitch_selected_app_id');
      localStorage.removeItem('nana_current_app_id');
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith('nana_merchant_universes') ||
            k.startsWith('nana_id_chain_') ||
            k.startsWith('nanasore_kyc_chain_') ||
            k.startsWith('nanasore_payout_history_'))
        ) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
  }
}

/**
 * Récupère l'utilisateur Supabase actuel
 */
export async function getSupabaseCurrentUser(): Promise<SupabaseAuthUser | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Utilisateur';
    return {
      id: user.id,
      uid: user.id,
      email: user.email || '',
      displayName,
      name: displayName,
      fullName: displayName,
      emailVerified: Boolean(user.confirmed_at || user.email_confirmed_at),
      providerData: [{ providerId: user.app_metadata?.provider || 'password' }],
      role: user.user_metadata?.seller_mode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
      sellerMode: user.user_metadata?.seller_mode || 'merchant_ecommerce',
    };
  } catch {
    return null;
  }
}

/**
 * Écouteur de changement d'état d'authentification Supabase (remplace onAuthStateChanged)
 */
export function onSupabaseAuthStateChange(callback: (user: SupabaseAuthUser | null) => void): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const u = session.user;
      const displayName = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Utilisateur';
      callback({
        id: u.id,
        uid: u.id,
        email: u.email || '',
        displayName,
        name: displayName,
        fullName: displayName,
        emailVerified: Boolean(u.confirmed_at || u.email_confirmed_at),
        providerData: [{ providerId: u.app_metadata?.provider || 'password' }],
        role: u.user_metadata?.seller_mode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
        sellerMode: u.user_metadata?.seller_mode || 'merchant_ecommerce',
      });
    } else {
      callback(null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}
