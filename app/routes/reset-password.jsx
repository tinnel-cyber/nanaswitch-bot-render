import React from "react";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation, useSearchParams } from "@remix-run/react";
import { sendPasswordResetEmail } from "../utils/email.server";
import { adminAuth, adminDb, getUserByEmail, updateUserPassword } from "../utils/firebase.server";
import crypto from "crypto";

/**
 * Action: Demande de réinitialisation de mot de passe (forgot-password)
 */
export async function action({ request }) {
  const formData = await request.formData();
  const email = (formData.get("email") || "").trim().toLowerCase();
  const token = formData.get("token")?.toString();
  const newPassword = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  // Si un token est présent, c'est une confirmation de réinitialisation
  if (token && newPassword) {
    return handlePasswordResetConfirmation(token, newPassword, confirmPassword);
  }

  // Sinon, c'est une demande de réinitialisation (forgot-password)
  return handlePasswordResetRequest(email);
}

/**
 * Gère la demande de réinitialisation de mot de passe
 */
async function handlePasswordResetRequest(email: string) {
  if (!email || !email.includes("@")) {
    return json(
      { success: false, error: "Veuillez fournir une adresse e-mail valide." },
      { status: 400 }
    );
  }

  try {
    // 1. Vérifier si l'utilisateur existe dans Firebase
    const userRecord = await getUserByEmail(email);

    // Pour des raisons de sécurité, on continue même si l'utilisateur n'existe pas
    // Mais on n'envoie l'email que si l'utilisateur existe
    if (userRecord) {
      // 2. Générer un token sécurisé unique
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 3600000; // Valide 1 heure

      // 3. Stocker le token dans Firestore (collection passwordResets)
      await adminDb.collection("passwordResets").doc(resetToken).set({
        uid: userRecord.uid,
        email: email,
        expiresAt: expiresAt,
        createdAt: new Date().toISOString(),
      });

      // 4. Générer l'URL dynamique de réinitialisation
      const appUrl = process.env.APP_URL || "https://nanasore.com";
      const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

      // 5. Envoyer l'e-mail via Brevo (Template #2)
      await sendPasswordResetEmail({
        email,
        name: userRecord.displayName || email.split("@")[0],
        resetUrl,
      });

      console.log(`[PASSWORD RESET] Email de réinitialisation envoyé à ${email}`);
    }

    // 6. Réponse serveur (même message pour éviter l'énumération d'emails)
    return json({
      success: true,
      message: "Si cette adresse e-mail correspond à un compte, un lien de réinitialisation a été envoyé.",
    });
  } catch (error) {
    console.error("❌ Erreur lors de la demande de réinitialisation:", error);
    // Pour des raisons de sécurité, on retourne toujours un succès
    return json({
      success: true,
      message: "Si cette adresse e-mail correspond à un compte, un lien de réinitialisation a été envoyé.",
    });
  }
}

/**
 * Gère la confirmation de réinitialisation de mot de passe
 */
async function handlePasswordResetConfirmation(token: string, newPassword: string, confirmPassword: string) {
  if (!token || !newPassword) {
    return json({ error: "Données manquantes." }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return json({ error: "Le mot de passe doit contenir au moins 6 caractères." }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return json({ error: "Les mots de passe ne correspondent pas." }, { status: 400 });
  }

  const tokenRef = adminDb.collection("passwordResets").doc(token);
  const tokenDoc = await tokenRef.get();

  if (!tokenDoc.exists) {
    return json({ error: "Lien invalide ou expiré." }, { status: 400 });
  }

  const tokenData = tokenDoc.data();

  if (Date.now() > tokenData.expiresAt) {
    await tokenRef.delete();
    return json({ error: "Ce lien de réinitialisation a expiré." }, { status: 400 });
  }

  try {
    // Mettre à jour le mot de passe dans Firebase Auth
    await updateUserPassword(tokenData.uid, newPassword);

    // Supprimer le token utilisé
    await tokenRef.delete();

    return json({
      success: true,
      message: "Mot de passe mis à jour avec succès. Vous pouvez maintenant vous connecter.",
    });
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour du mot de passe:", error);
    return json({ error: "Erreur lors de la mise à jour du mot de passe." }, { status: 500 });
  }
}

export default function ResetPasswordRoute() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const isResetMode = !!token && !actionData?.success;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-100 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl text-slate-900">
        <div className="text-center mb-6">
          <span className="text-xs font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
            Sécurité du Compte
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-2">
            {isResetMode ? "Réinitialiser le mot de passe" : "Mot de passe oublié"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isResetMode
              ? "Entrez votre nouveau mot de passe sécurisé."
              : "Entrez votre adresse e-mail pour recevoir un lien de réinitialisation sécurisé."}
          </p>
        </div>

        {actionData?.error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            ⚠️ {actionData.error}
          </div>
        )}

        {actionData?.success && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            ✅ {actionData.message}
          </div>
        )}

        <Form method="post" className="space-y-4">
          {!isResetMode ? (
            // Formulaire de demande de réinitialisation
            <>
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1">
                  Adresse e-mail associée au compte
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="votre-email@exemple.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-sm shadow-lg transition cursor-pointer active:scale-98"
              >
                {isSubmitting ? "Envoi du lien en cours..." : "Envoyer le lien de réinitialisation →"}
              </button>
            </>
          ) : (
            // Formulaire de réinitialisation (avec token)
            <>
              <input type="hidden" name="token" value={token} />

              <div>
                <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-sm shadow-lg transition cursor-pointer active:scale-98"
              >
                {isSubmitting ? "Mise à jour en cours..." : "Mettre à jour le mot de passe →"}
              </button>
            </>
          )}
        </Form>

        {!isResetMode && (
          <div className="mt-6 text-center">
            <a
              href="/signup"
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              ← Retour à la page de connexion
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
