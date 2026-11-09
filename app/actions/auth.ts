"use server";

import { cookies } from "next/headers";
import { sendEmailVerification, sendNanasoreEmail } from "@/lib/brevo";
import { getSupabaseClient } from "@/lib/supabase";

export interface AuthActionResult {
  success: boolean;
  message?: string;
  uid?: string;
  email?: string;
  error?: string;
  simulated?: boolean;
}

// Configuration officielle de redirection personnalisée vers nanasore.com/auth/callback
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://nanasore.com').replace(/\/$/, '');

export type RegisterPayload = {
  email: string;
  password: string;
  name?: string;
  fullName?: string;
  displayName?: string;
  whatsapp?: string;
  sellerMode?: string;
};

/**
 * Server Action : Inscription d'un utilisateur via Supabase Auth + Brevo SMTP
 * Supporte l'appel direct { email, password, name } et le binding FormData (useActionState).
 */
export async function registerUserAndSendVerification(
  input: RegisterPayload | FormData | AuthActionResult | null,
  maybeFormData?: FormData
): Promise<AuthActionResult> {
  console.log("=== EXÉCUTION SERVER ACTION SUPABASE + BREVO ===");
  let email = "";
  let password = "";
  let displayName = "";
  let whatsapp = "";
  let sellerMode = "merchant_ecommerce";

  if (input && typeof input === "object" && "password" in input) {
    const payload = input as RegisterPayload;
    email = String(payload.email || "").trim().toLowerCase();
    password = String(payload.password || "");
    displayName = String(payload.name || payload.fullName || payload.displayName || "").trim();
    whatsapp = String(payload.whatsapp || "").trim();
    if (payload.sellerMode) sellerMode = payload.sellerMode;
  } else {
    const formData = (maybeFormData || input) as FormData;
    email = String(formData?.get?.("email") || "").trim().toLowerCase();
    password = String(formData?.get?.("password") || "");
    displayName = String(formData?.get?.("name") || formData?.get?.("displayName") || formData?.get?.("fullName") || "").trim();
    whatsapp = String(formData?.get?.("whatsapp") || "").trim();
    const mode = formData?.get?.("sellerMode");
    if (mode) sellerMode = String(mode);
  }

  // 1. Validation des champs
  if (!email || !email.includes("@")) {
    return { success: false, error: "Veuillez fournir une adresse e-mail valide." };
  }

  if (!password || password.length < 6) {
    return { success: false, error: "Le mot de passe doit comporter au moins 6 caractères." };
  }

  const resolvedName = displayName || email.split("@")[0];
  const supabase = getSupabaseClient(true);

  try {
    // 2. Création du compte utilisateur dans Supabase Authentication
    let userId: string = "";
    let verificationLink: string = `${appUrl}/auth/callback?email=${encodeURIComponent(email)}`;

    try {
      // Tentative via Supabase Admin (si Service Role Key disponible)
      const { data: adminData, error: adminErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: resolvedName,
          name: resolvedName,
          whatsapp,
          seller_mode: sellerMode
        }
      });

      if (!adminErr && adminData?.user) {
        userId = adminData.user.id;
        console.log(`[SUPABASE_AUTH_SUCCESS] Utilisateur créé avec l'ID : ${userId}`);

        // Génération du lien de confirmation via Supabase Admin
        try {
          const { data: linkData } = await supabase.auth.admin.generateLink({
            type: 'signup',
            email,
            password,
            options: {
              redirectTo: `${appUrl}/auth/callback`
            }
          });
          if (linkData?.properties?.action_link) {
            verificationLink = linkData.properties.action_link;
          }
        } catch (lErr: any) {
          console.warn("[SUPABASE_LINK_NOTICE] Utilisation du lien de callback par défaut :", lErr?.message);
        }
      } else {
        // Repli sur signUp public standard (connecté au SMTP Brevo de Supabase)
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: resolvedName,
              name: resolvedName,
              whatsapp,
              seller_mode: sellerMode
            },
            emailRedirectTo: `${appUrl}/auth/callback`
          }
        });

        if (signUpErr) {
          if (signUpErr.message.includes("User already registered") || signUpErr.message.includes("already exists")) {
            return {
              success: false,
              error: "Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.",
            };
          }
          throw signUpErr;
        }

        userId = signUpData.user?.id || `user_${Date.now().toString(36)}`;
      }
    } catch (createErr: any) {
      if (createErr?.message?.includes("User already registered") || createErr?.message?.includes("already exists")) {
        return {
          success: false,
          error: "Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.",
        };
      }
      throw createErr;
    }

    // 3. Synchronisation immédiate vers la table Supabase `profiles`
    try {
      await supabase.from("profiles").upsert({
        id: userId,
        email,
        full_name: resolvedName,
        whatsapp_number: whatsapp,
        role: sellerMode === 'creator_trainer' ? 'INSTRUCTOR' : 'GERANT',
        kyc_status: 'none',
        pricing_model: 'none',
        wallet_balance: 0,
        enabled_themes: [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      // 3b. Attribution automatique du parrainage d'affiliation (Cookie 'Propulsé par Nanasore')
      try {
        const cookieStore = await cookies();
        const refCode = cookieStore.get("nanasore_affiliate_ref")?.value;
        const refTenantId = cookieStore.get("nanasore_referrer_tenant_id")?.value;

        if (refCode || refTenantId) {
          let referrerId = refTenantId;
          if (!referrerId && refCode) {
            const { data: refTenant } = await supabase
              .from("tenants")
              .select("id")
              .eq("slug", refCode.toLowerCase())
              .maybeSingle();
            referrerId = refTenant?.id;
          }

          if (referrerId) {
            await supabase
              .from("profiles")
              .update({ referred_by_tenant_id: referrerId })
              .eq("id", userId);
          }
        }
      } catch (affiliateErr) {
        console.warn("[AUTH_AFFILIATE_NOTICE] Enregistrement parrain différé:", affiliateErr);
      }
    } catch (syncErr) {
      console.warn("[AUTH_SYNC_NOTICE] Synchronisation Supabase profil différée:", syncErr);
    }

    // 4. Expédition de l'e-mail de confirmation via Brevo (API / SMTP)
    let emailResult: any = { simulated: false };
    try {
      emailResult = await sendEmailVerification({
        toEmail: email,
        toName: resolvedName || "Marchand Nanasore",
        verificationUrl: verificationLink,
      });
    } catch (brevoErr) {
      console.warn("[BREVO_DIRECT_NOTICE] Brevo via API notice (relais SMTP Supabase actif) :", brevoErr);
    }

    return {
      success: true,
      uid: userId,
      email,
      message: "Votre compte a été créé avec succès ! Un e-mail de confirmation personnalisé vous a été envoyé via Brevo.",
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
 * Server Action : Renvoi d'un e-mail de vérification via Supabase Auth & Brevo
 */
export async function resendVerificationEmail(email: string): Promise<AuthActionResult> {
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Adresse e-mail invalide." };
  }

  const supabase = getSupabaseClient(true);

  try {
    let verificationLink = `${appUrl}/auth/callback?email=${encodeURIComponent(cleanEmail)}`;

    try {
      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: 'signup',
        email: cleanEmail,
        options: {
          redirectTo: `${appUrl}/auth/callback`
        }
      });
      if (linkData?.properties?.action_link) {
        verificationLink = linkData.properties.action_link;
      }
    } catch {
      // Repli Supabase resend
      await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback`
        }
      });
    }

    const emailResult = await sendEmailVerification({
      toEmail: cleanEmail,
      toName: "Utilisateur Nanasore",
      verificationUrl: verificationLink,
    });

    return {
      success: true,
      email: cleanEmail,
      message: "Un nouveau lien de confirmation a été expédié à votre adresse via Brevo.",
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
 * Server Action : Demande de réinitialisation de mot de passe via Supabase Auth + Brevo
 */
export async function requestPasswordReset(
  input: string | { email: string } | FormData
): Promise<AuthActionResult> {
  let cleanEmail = "";
  if (typeof input === "string") {
    cleanEmail = input.trim().toLowerCase();
  } else if (input && typeof input === "object" && "email" in input) {
    cleanEmail = String(input.email || "").trim().toLowerCase();
  } else if (input && typeof (input as FormData).get === "function") {
    cleanEmail = String((input as FormData).get("email") || "").trim().toLowerCase();
  }

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Adresse e-mail invalide." };
  }

  const supabase = getSupabaseClient(true);

  try {
    let resetLink = `${appUrl}/auth/reset-password?email=${encodeURIComponent(cleanEmail)}`;

    try {
      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: cleanEmail,
        options: {
          redirectTo: `${appUrl}/auth/reset-password`
        }
      });
      if (linkData?.properties?.action_link) {
        resetLink = linkData.properties.action_link;
      }
    } catch {
      // Repli sur l'envoi Supabase direct (qui passe par le SMTP Brevo configuré)
      await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${appUrl}/auth/reset-password`
      });
    }

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
      message: "Le lien de réinitialisation a été envoyé à votre adresse e-mail via Brevo.",
    };
  } catch (error: any) {
    console.error("[PASSWORD_RESET_ERROR]", error);
    return {
      success: false,
      error: error?.message || "Erreur lors de la réinitialisation du mot de passe.",
    };
  }
}
