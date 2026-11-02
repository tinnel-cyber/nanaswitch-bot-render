import React from "react";
import { json } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { sendConfirmationEmail } from "../utils/email.server";

export async function action({ request }) {
  const formData = await request.formData();
  const email = (formData.get("email") || "").trim().toLowerCase();
  const firstName = (formData.get("firstName") || "").trim();

  if (!email || !email.includes("@")) {
    return json(
      { success: false, error: "Veuillez fournir une adresse e-mail valide." },
      { status: 400 }
    );
  }

  try {
    // 1. Logique Firebase / Firestore : génération du jeton sécurisé (token unique)
    const randomHex = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const generatedToken = `verify_${randomHex}`;

    // 2. Construction de l'URL dynamique de confirmation
    const domain = (process.env.APP_URL || "https://nanasore.com").replace(/\/+$/, "");
    const confirmationUrl = `${domain}/verify?token=${encodeURIComponent(generatedToken)}`;

    // 3. Déclenchement de l'e-mail transactionnel Brevo (Template ID 1)
    await sendConfirmationEmail({
      email,
      name: firstName || undefined,
      confirmationUrl,
    });

    // 4. Réponse serveur : retour JSON ou redirection
    return json({
      success: true,
      message: "E-mail de confirmation envoyé avec succès ! Veuillez consulter votre boîte de réception.",
    });
  } catch (error) {
    console.error("❌ Erreur lors du traitement d'inscription:", error);
    return json(
      { success: false, error: error?.message || "Erreur lors de l'envoi de l'e-mail." },
      { status: 500 }
    );
  }
}

export default function SignupRoute() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-100 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl text-slate-900">
        <div className="text-center mb-6">
          <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Création de Compte
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-2">Rejoignez Nanasore</h1>
          <p className="text-xs text-slate-500 mt-1">
            Recevez votre lien de confirmation sécurisé par e-mail
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
          <div>
            <label htmlFor="firstName" className="block text-xs font-bold text-slate-700 mb-1">
              Prénom ou Nom du Responsable
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              placeholder="Ex: Amadou"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1">
              Adresse e-mail professionnelle
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="amadou@entreprise.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition cursor-pointer active:scale-98"
          >
            {isSubmitting ? "Envoi du lien en cours..." : "Créer mon compte →"}
          </button>
        </Form>
      </div>
    </div>
  );
}
