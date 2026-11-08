import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * En-têtes CORS universels pour autoriser les invocations
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailPayload {
  to_email?: string;
  to_name?: string;
  subject?: string;
  html_content?: string;
  sender_name?: string;
  sender_email?: string;
  [key: string]: unknown;
}

const BREVO_SMTP_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

Deno.serve(async (req: Request) => {
  // 1. Gestion des requêtes CORS Preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Vérification de la méthode HTTP
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Méthode non autorisée. Utilisez POST." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // 2. Récupération de la clé API Brevo depuis les variables d'environnement / secrets Deno
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");

    if (!brevoApiKey) {
      console.error("[EMAIL-CAMPAIGN] Secret BREVO_API_KEY non configuré.");
      return new Response(
        JSON.stringify({
          error: "Configuration serveur manquante : le secret 'BREVO_API_KEY' n'est pas défini dans Supabase.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Lecture et décodage du body JSON
    let body: EmailPayload;
    try {
      body = await req.json();
    } catch (_err) {
      return new Response(
        JSON.stringify({ error: "Corps de requête JSON invalide ou illisible." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      to_email,
      to_name,
      subject,
      html_content,
      sender_name,
      sender_email,
    } = body;

    // 4. Validation stricte des champs obligatoires
    const missingFields: string[] = [];
    if (!to_email || typeof to_email !== "string" || !to_email.trim()) {
      missingFields.push("to_email");
    }
    if (!subject || typeof subject !== "string" || !subject.trim()) {
      missingFields.push("subject");
    }
    if (!html_content || typeof html_content !== "string" || !html_content.trim()) {
      missingFields.push("html_content");
    }

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Champs obligatoires manquants : ${missingFields.join(", ")}`,
          required: ["to_email", "subject", "html_content"],
          received: { to_email, subject, has_html: Boolean(html_content) },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validation basique du format email destinataire
    const cleanToEmail = to_email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanToEmail)) {
      return new Response(
        JSON.stringify({
          error: `Format d'adresse email invalide : '${cleanToEmail}'`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Configuration de l'expéditeur (valeurs fournies ou variables de repli Nanasore)
    const effectiveSenderEmail =
      sender_email?.trim() ||
      Deno.env.get("BREVO_SENDER_EMAIL") ||
      "contact@nanasore.com";

    const effectiveSenderName =
      sender_name?.trim() ||
      Deno.env.get("BREVO_SENDER_NAME") ||
      "Nanasore Platform";

    // 6. Construction du payload conforme à l'API Brevo v3 (Transactional Emails)
    const brevoPayload = {
      sender: {
        name: effectiveSenderName,
        email: effectiveSenderEmail,
      },
      to: [
        {
          email: cleanToEmail,
          name: to_name?.trim() || cleanToEmail,
        },
      ],
      subject: subject.trim(),
      htmlContent: html_content,
    };

    console.log(`[EMAIL-CAMPAIGN] Envoi courriel via Brevo vers ${cleanToEmail} (Sujet: "${subject.trim()}")`);

    // 7. Appel HTTP vers l'API REST v3 de Brevo
    const brevoResponse = await fetch(BREVO_SMTP_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    const brevoResponseText = await brevoResponse.text();
    let brevoData: Record<string, unknown> = {};

    try {
      brevoData = JSON.parse(brevoResponseText);
    } catch (_e) {
      brevoData = { raw: brevoResponseText };
    }

    // 8. Traitement du résultat Brevo
    if (!brevoResponse.ok) {
      console.error(`[EMAIL-CAMPAIGN] Échec Brevo API (HTTP ${brevoResponse.status}) :`, brevoData);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Échec de l'envoi de l'email via le service Brevo.",
          status: brevoResponse.status,
          details: brevoData,
        }),
        {
          status: brevoResponse.status >= 400 && brevoResponse.status < 500 ? 400 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[EMAIL-CAMPAIGN] Email expédié avec succès. MessageId: ${brevoData.messageId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email envoyé avec succès via Brevo.",
        messageId: brevoData.messageId,
        recipient: cleanToEmail,
        sent_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[EMAIL-CAMPAIGN] Exception non interceptée :", error);
    return new Response(
      JSON.stringify({
        error: "Erreur interne du serveur lors de l'envoi de l'email",
        details: error?.message || String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
