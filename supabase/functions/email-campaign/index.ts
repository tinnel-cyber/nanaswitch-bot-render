import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://nsore.shop",
  "https://www.nsore.shop",
  "https://nanasore.com",
  "https://www.nanasore.com",
  "https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run",
]);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://nsore.shop";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

interface EmailPayload {
  to_email?: string;
  to_name?: string;
  subject?: string;
  html_content?: string;
  sender_name?: string;
  [key: string]: unknown;
}

const BREVO_SMTP_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Méthode non autorisée. Utilisez POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // 1. Authentification obligatoire : JWT Supabase valide OU secret interne serveur
    const internalSecret = Deno.env.get("INTERNAL_API_SECRET");
    const providedInternal = req.headers.get("x-internal-secret");
    const authHeader = req.headers.get("authorization") || "";
    let isAuthorized = false;

    if (internalSecret && providedInternal && providedInternal === internalSecret) {
      isAuthorized = true;
    } else if (authHeader.startsWith("Bearer ")) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Authentification requise pour envoyer des emails." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      console.error("[EMAIL-CAMPAIGN] Secret BREVO_API_KEY non configuré.");
      return new Response(
        JSON.stringify({ error: "Configuration serveur manquante : BREVO_API_KEY." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let body: EmailPayload;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Corps de requête JSON invalide ou illisible." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { to_email, to_name, subject, html_content, sender_name } = body;

    const missingFields: string[] = [];
    if (!to_email || typeof to_email !== "string" || !to_email.trim()) missingFields.push("to_email");
    if (!subject || typeof subject !== "string" || !subject.trim()) missingFields.push("subject");
    if (!html_content || typeof html_content !== "string" || !html_content.trim()) missingFields.push("html_content");

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ error: `Champs obligatoires manquants : ${missingFields.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanToEmail = to_email!.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanToEmail)) {
      return new Response(
        JSON.stringify({ error: `Format d'adresse email invalide : '${cleanToEmail}'` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Expéditeur verrouillé sur le domaine configuré côté serveur (anti-spoofing)
    const effectiveSenderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "contact@nanasore.com";
    const effectiveSenderName = sender_name?.trim() || Deno.env.get("BREVO_SENDER_NAME") || "Nanasore Platform";

    const brevoPayload = {
      sender: { name: effectiveSenderName, email: effectiveSenderEmail },
      to: [{ email: cleanToEmail, name: to_name?.trim() || cleanToEmail }],
      subject: subject!.trim(),
      htmlContent: html_content,
    };

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
    } catch {
      brevoData = { raw: brevoResponseText };
    }

    if (!brevoResponse.ok) {
      console.error(`[EMAIL-CAMPAIGN] Échec Brevo API (HTTP ${brevoResponse.status})`);
      return new Response(
        JSON.stringify({ success: false, error: "Échec de l'envoi de l'email via Brevo.", status: brevoResponse.status }),
        { status: brevoResponse.status >= 400 && brevoResponse.status < 500 ? 400 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email envoyé avec succès via Brevo.",
        messageId: brevoData.messageId,
        recipient: cleanToEmail,
        sent_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[EMAIL-CAMPAIGN] Exception non interceptée:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur lors de l'envoi de l'email." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
