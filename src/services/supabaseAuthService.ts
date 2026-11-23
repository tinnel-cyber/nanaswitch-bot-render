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
    if (
      error.message.includes('User already registered') ||
      error.message.includes('already registered') ||
      error.message.includes('already exists')
    ) {
      const dupErr: any = new Error('Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.');
      dupErr.code = 'auth/email-already-in-use';
      throw dupErr;
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

  // Détection critique Supabase : lorsque mailer_autoconfirm=false et que l'e-mail existe déjà,
  // Supabase renvoie un user obfusqué avec identities: [] et n'envoie AUCUN e-mail.
  if (Array.isArray((u as any).identities) && (u as any).identities.length === 0) {
    const dupErr: any = new Error('Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter ou réinitialiser votre mot de passe.');
    dupErr.code = 'auth/email-already-in-use';
    throw dupErr;
  }

  const isEmailConfirmed = Boolean(u.confirmed_at || u.email_confirmed_at);

  const authUser: SupabaseAuthUser = {
    id: u.id,
    uid: u.id,
    email: u.email || cleanEmail,
    displayName: resolvedName,
    name: resolvedName,
    fullName: resolvedName,
    emailVerified: isEmailConfirmed,
    providerData: [{ providerId: 'password' }],
    role: sellerMode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
    sellerMode,
  };

  // Ne synchroniser et ne persister la session locale QUE si l'e-mail est réellement confirmé et qu'une session JWT est active
  if (isEmailConfirmed && data.session?.access_token) {
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
        localStorage.setItem('nana_auth_token', data.session.access_token);
      } catch {}
    }
  } else if (typeof window !== 'undefined') {
    // S'assurer qu'aucune session locale non vérifiée ne traîne dans le navigateur
    try {
      localStorage.removeItem('nana_store_auth_user');
      localStorage.removeItem('nana_auth_token');
    } catch {}
  }

  return authUser;
}

/**
 * Vérifie strictement auprès de Supabase Auth si l'adresse e-mail a bien été confirmée
 * (utilisé par le bouton "J'ai validé mon email • Continuer")
 */
export async function verifyEmailConfirmationStatus(
  email: string,
  password?: string
): Promise<{ verified: boolean; user?: SupabaseAuthUser; message?: string }> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  try {
    // 1. Vérifier s'il existe déjà une session active confirmée
    const { data: userData } = await supabase.auth.getUser();
    const currentU = userData?.user;
    if (currentU && (currentU.confirmed_at || currentU.email_confirmed_at)) {
      const { data: sessData } = await supabase.auth.getSession();
      const displayName = currentU.user_metadata?.full_name || currentU.user_metadata?.name || cleanEmail.split('@')[0] || 'Utilisateur';
      const authUser: SupabaseAuthUser = {
        id: currentU.id,
        uid: currentU.id,
        email: currentU.email || cleanEmail,
        displayName,
        name: displayName,
        fullName: displayName,
        emailVerified: true,
        providerData: [{ providerId: 'password' }],
        role: currentU.user_metadata?.seller_mode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
        sellerMode: currentU.user_metadata?.seller_mode || 'merchant_ecommerce',
      };
      if (typeof window !== 'undefined' && sessData?.session?.access_token) {
        try {
          localStorage.setItem('nana_store_auth_user', JSON.stringify({ ...authUser, plan: 'free' }));
          localStorage.setItem('nana_auth_token', sessData.session.access_token);
        } catch {}
      }
      return { verified: true, user: authUser };
    }

    // 2. Sinon, tenter une connexion réelle avec email + mot de passe pour vérifier si le lien a été cliqué sur un autre appareil/onglet
    if (cleanEmail && password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          return {
            verified: false,
            message: "Votre adresse e-mail n'est pas encore confirmée. Veuillez ouvrir l'e-mail reçu et cliquer sur le lien de confirmation avant de continuer (vérifiez aussi vos courriers indésirables/spams)."
          };
        }
        if (error.message.includes('Invalid login credentials')) {
          return {
            verified: false,
            message: "Aucun clic de confirmation détecté ou ce compte existe déjà avec un autre mot de passe. Vérifiez votre boîte mail ou connectez-vous."
          };
        }
        return {
          verified: false,
          message: error.message || "Votre adresse e-mail n'a pas encore été validée."
        };
      }

      const u = data?.user;
      if (u && (u.confirmed_at || u.email_confirmed_at) && data?.session?.access_token) {
        const displayName = u.user_metadata?.full_name || u.user_metadata?.name || cleanEmail.split('@')[0] || 'Utilisateur';
        const authUser: SupabaseAuthUser = {
          id: u.id,
          uid: u.id,
          email: u.email || cleanEmail,
          displayName,
          name: displayName,
          fullName: displayName,
          emailVerified: true,
          providerData: [{ providerId: 'password' }],
          role: u.user_metadata?.seller_mode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
          sellerMode: u.user_metadata?.seller_mode || 'merchant_ecommerce',
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('nana_store_auth_user', JSON.stringify({ ...authUser, plan: 'free' }));
            localStorage.setItem('nana_auth_token', data.session.access_token);
          } catch {}
        }
        return { verified: true, user: authUser };
      }
    }

    return {
      verified: false,
      message: "Votre adresse e-mail n'est pas encore confirmée. Veuillez cliquer sur le lien reçu par e-mail avant de continuer."
    };
  } catch (err: any) {
    return {
      verified: false,
      message: err?.message || "Impossible de vérifier la confirmation de votre e-mail."
    };
  }
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

  // 1. Envoi officiel unique via Supabase Auth (évite un 2e envoi qui invaliderait le 1er lien)
  const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: redirectUrl,
  });

  if (!resetErr) {
    return;
  }

  console.warn('[SUPABASE AUTH RESET] Fallback vers /api/auth/reset-password :', resetErr.message);

  // 2. Repli serveur (Brevo + lien cross-device token_hash) uniquement si Supabase Auth a refusé
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Impossible d\'envoyer le lien de réinitialisation.');
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
        // Si une session active existe déjà (ex. double appel ou déjà validé), on l'accepte
        const { data: existingSess } = await supabase.auth.getSession();
        if (existingSess?.session?.user) {
          session = existingSess.session;
          supaUser = existingSess.session.user;
        } else {
          return { success: false, error: error.message || 'Lien de confirmation invalide ou expiré.' };
        }
      } else {
        session = data?.session || null;
        supaUser = data?.user || data?.session?.user || null;
      }
    } else if (code) {
      // Vérifier d'abord si detectSessionInUrl a déjà échangé le code automatiquement
      const { data: preSess } = await supabase.auth.getSession();
      if (preSess?.session?.user) {
        session = preSess.session;
        supaUser = preSess.session.user;
      } else {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          const { data: retrySess } = await supabase.auth.getSession();
          if (retrySess?.session?.user) {
            session = retrySess.session;
            supaUser = retrySess.session.user;
          } else {
            return {
              success: false,
              error: error.message?.includes('code verifier')
                ? 'Ce lien a été ouvert sur un autre appareil. Veuillez demander un nouveau lien ou vous connecter avec votre mot de passe.'
                : (error.message || 'Échec de validation du code de session.'),
            };
          }
        } else {
          session = data?.session || null;
          supaUser = data?.user || data?.session?.user || null;
        }
      }
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
