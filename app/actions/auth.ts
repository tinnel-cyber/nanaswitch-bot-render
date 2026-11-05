"use server";

import { adminAuth } from "@/lib/firebase-admin";
import { sendEmailVerification, sendNanasoreEmail } from "@/lib/brevo";
import { syncFirebaseProfileToSupabase } from "@/lib/supabase";

export interface AuthActionResult {
  success: boolean;
  message?: string;
  uid?: string;
  email?: string;
  error?: string;
  simulated?: boolean;
}

// Configuration officielle de redirection personnalisée vers nanasore.com/auth/action
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://nanasore.com').replace(/\/$/, '');

export const actionCodeSettings = {
  url: `${appUrl}/auth/action`,
  handleCodeInApp: true,
};

/**
 * Server Action : Inscription d'un utilisateur, génération du lien sécurisé
 * Firebase Admin ciblant https://nanasore.com/auth/action et expédition via Brevo.
 */
export async function registerUserAndSendVerification(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("displayName") || formData.get("fullName") || "").trim();
  const whatsapp = String(formData.get("whatsapp") || "").trim();

  // 1. Validation des champs
  if (!email || !email.includes("@")) {
    return { success: false, error: "Veuillez fournir une adresse e-mail valide." };
  }

  if (!password || password.length < 6) {
    return { success: false, error: "Le mot de passe doit comporter au moins 6 caractères." };
  }

  try {
    // 2. Création du compte utilisateur dans Firebase Authentication
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: displayName || email.split("@")[0],
        emailVerified: false,
      });
      console.log(`[AUTH_REGISTER_SUCCESS] Utilisateur Firebase créé avec l'UID : ${userRecord.uid}`);
    } catch (createErr: any) {
      if (createErr.code === "auth/email-already-exists") {
        return {
          success: false,
          error: "Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.",
        };
      }
      throw createErr;
    }

    // 3. Synchronisation de l'UID Firebase vers la table Supabase `profiles`
    try {
      await syncFirebaseProfileToSupabase({
        firebaseUid: userRecord.uid,
        email: userRecord.email || email,
        fullName: displayName,
        whatsapp,
      });
    } catch (syncErr) {
      console.warn("[AUTH_SYNC_NOTICE] Synchronisation Supabase profil différée:", syncErr);
    }

    // 4. Génération du lien de vérification avec redirection personnalisée vers https://nanasore.com/auth/action
    let verificationLink: string;
    try {
      verificationLink = await adminAuth.generateEmailVerificationLink(email, actionCodeSettings);
      console.log(`[FIREBASE_ADMIN] Lien de vérification généré avec redirection vers ${actionCodeSettings.url} pour ${email}`);
    } catch (linkErr: any) {
      console.warn("[FIREBASE_ADMIN_LINK_WARN] Repli sur lien applicatif standard:", linkErr.message);
      verificationLink = `${actionCodeSettings.url}?mode=verifyEmail&email=${encodeURIComponent(email)}&uid=${userRecord.uid}`;
    }

    // 5. Expédition de l'e-mail personnalisé via Brevo SDK
    const emailResult = await sendEmailVerification({
      toEmail: email,
      toName: displayName || "Marchand Nanasore",
      verificationUrl: verificationLink,
    });

    return {
      success: true,
      uid: userRecord.uid,
      email,
      message: "Votre compte a été créé avec succès ! Un e-mail de confirmation personnalisé vous a été envoyé.",
      simulated: (emailResult as any)?.simulated || false,
    };
  } catch (error: any) {
    console.error("[REGISTER_ACTION_ERROR]", error);
    return {
      success: false,
      error: error?.message || "Erreur technique lors de la création du compte.",
    };
  }
}

/**
 * Server Action : Renvoi d'un e-mail de vérification via Firebase Admin & Brevo
 * avec actionCodeSettings vers https://nanasore.com/auth/action
 */
export async function resendVerificationEmail(email: string): Promise<AuthActionResult> {
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Adresse e-mail invalide." };
  }

  try {
    const verificationLink = await adminAuth.generateEmailVerificationLink(cleanEmail, actionCodeSettings);

    const emailResult = await sendEmailVerification({
      toEmail: cleanEmail,
      toName: "Utilisateur Nanasore",
      verificationUrl: verificationLink,
    });

    return {
      success: true,
      email: cleanEmail,
      message: "Un nouveau lien de confirmation a été expédié à votre adresse.",
      simulated: (emailResult as any)?.simulated || false,
    };
  } catch (error: any) {
    console.error("[RESEND_VERIFICATION_ERROR]", error);
    return {
      success: false,
      error: error?.message || "Impossible de générer le lien de vérification.",
    };
  }
}

/**
 * Server Action : Demande de réinitialisation de mot de passe via Brevo
 * avec actionCodeSettings vers https://nanasore.com/auth/action
 */
export async function requestPasswordReset(email: string): Promise<AuthActionResult> {
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Adresse e-mail invalide." };
  }

  try {
    const resetLink = await adminAuth.generatePasswordResetLink(cleanEmail, actionCodeSettings);

    await sendNanasoreEmail({
      toEmail: cleanEmail,
      subject: "Réinitialisation de votre mot de passe Nanasore",
      preheader: "Accès sécurisé à votre espace",
      messageHtml: `
        <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Réinitialisation de mot de passe</h2>
        <p style="margin-bottom: 16px;">
          Une demande de réinitialisation de mot de passe a été reçue pour votre compte Nanasore. Cliquez sur le bouton ci-dessous pour choisir votre nouveau mot de passe sécurisé :
        </p>
      `,
      ctaText: "Changer mon mot de passe",
      ctaUrl: resetLink,
      securityNote: "Ce lien temporaire expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, veuillez vérifier la sécurité de votre compte.",
    });

    return {
      success: true,
      email: cleanEmail,
      message: "Le lien de réinitialisation a été envoyé à votre adresse e-mail.",
    };
  } catch (error: any) {
    console.error("[PASSWORD_RESET_ERROR]", error);
    return {
      success: false,
      error: error?.message || "Erreur lors de la réinitialisation du mot de passe.",
    };
  }
}
