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
    console.error('[SUPABASE AUTH] Erreur connexion email :', error.message);
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
    console.error('[SUPABASE AUTH] Erreur inscription :', error.message);
    let msg = error.message;
    if (msg.includes('User already registered')) {
      msg = 'Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.';
    }
    throw new Error(msg);
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
 * Réinitialisation du mot de passe par e-mail via Supabase Auth
 */
export async function resetPasswordEmail(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new Error('Adresse e-mail requise.');

  const redirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/reset-password`
    : 'https://nanasore.com/auth/reset-password';

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: redirectUrl,
  });

  if (error) {
    console.error('[SUPABASE AUTH] Erreur reset password :', error.message);
    throw new Error(error.message || 'Impossible d’envoyer le lien de réinitialisation.');
  }
}

/**
 * Renvoyer l'e-mail de confirmation via Supabase Auth
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

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    return !error;
  } catch {
    return false;
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
