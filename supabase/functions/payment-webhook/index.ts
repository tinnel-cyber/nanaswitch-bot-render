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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-nanaswitch-signature, x-sebpay-signature, x-saspay-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

interface WebhookPayload {
  transaction_id?: string;
  status?: string;
  tenant_id?: string;
  amount?: number | string;
  customer_phone?: string;
  order_id?: string;
  [key: string]: unknown;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const cleanA = a.replace(/^sha256=/i, "").trim().toLowerCase();
  const cleanB = b.replace(/^sha256=/i, "").trim().toLowerCase();
  if (cleanA.length !== cleanB.length || cleanA.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < cleanA.length; i++) {
    diff |= cleanA.charCodeAt(i) ^ cleanB.charCodeAt(i);
  }
  return diff === 0;
}

async function verifyHmacSha256(rawBody: string, secret: string, receivedSignature: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expectedHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return timingSafeEqualHex(expectedHex, receivedSignature);
}

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const webhookSecret = Deno.env.get("PAYMENT_WEBHOOK_SECRET") || Deno.env.get("SASPAY_WEBHOOK_SECRET") || Deno.env.get("SEBPAY_WEBHOOK_SECRET");

    if (!supabaseUrl || !supabaseServiceKey || !webhookSecret) {
      console.error("[PAYMENT-WEBHOOK] Variables d'environnement critiques manquantes (SUPABASE_* ou PAYMENT_WEBHOOK_SECRET)");
      return new Response(
        JSON.stringify({ error: "Configuration serveur incomplète." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Lecture du corps brut et vérification cryptographique HMAC-SHA256 obligatoire
    const rawBody = await req.text();
    const receivedSignature =
      req.headers.get("x-webhook-signature") ||
      req.headers.get("x-nanaswitch-signature") ||
      req.headers.get("x-sebpay-signature") ||
      req.headers.get("x-saspay-signature") ||
      "";

    if (!receivedSignature || !(await verifyHmacSha256(rawBody, webhookSecret, receivedSignature))) {
      console.warn("[PAYMENT-WEBHOOK] Signature HMAC manquante ou invalide — requête rejetée.");
      return new Response(
        JSON.stringify({ error: "Signature webhook invalide ou manquante." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: "Corps de requête JSON invalide ou illisible." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { transaction_id, status, tenant_id, amount, customer_phone, order_id } = payload;

    if (!order_id || !status) {
      return new Response(
        JSON.stringify({ error: "Champs obligatoires manquants : 'order_id' et 'status' sont requis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const nowIso = new Date().toISOString();
    const cleanStatus = String(status).trim().toUpperCase();
    const isSuccess = cleanStatus === "SUCCESS" || cleanStatus === "COMPLETED" || cleanStatus === "PAID";
    const numericAmount = typeof amount === "number" ? amount : parseFloat(String(amount || "0")) || 0;

    if (isSuccess) {
      // Vérification d'idempotence sur transaction_id dans payment_logs
      if (transaction_id) {
        const { data: existingLog } = await supabase
          .from("payment_logs")
          .select("id")
          .eq("transaction_id", transaction_id)
          .in("status", ["SUCCESS", "COMPLETED", "PAID"])
          .maybeSingle();
        if (existingLog) {
          return new Response(
            JSON.stringify({ success: true, already_processed: true, order_id, transaction_id }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // Mise à jour sécurisée sans interpolation PostgREST brute et sans contournement de tenant_id
      let salesQuery = supabase
        .from("sales")
        .update({ payment_status: "paid", updated_at: nowIso })
        .eq("id", String(order_id));

      if (tenant_id && typeof tenant_id === "string" && /^[a-zA-Z0-9_-]+$/.test(tenant_id)) {
        salesQuery = salesQuery.eq("organization_id", tenant_id);
      }

      const { error: updateError } = await salesQuery.select("id");
      if (updateError) {
        console.error("[PAYMENT-WEBHOOK] Erreur mise à jour sales:", updateError.message);
      }

      const { error: logError } = await supabase.from("payment_logs").insert({
        tenant_id: tenant_id || null,
        transaction_id: transaction_id || null,
        amount: numericAmount,
        status: cleanStatus,
        customer_phone: customer_phone || null,
        raw_payload: payload,
        created_at: nowIso,
      });

      if (logError) {
        console.error("[PAYMENT-WEBHOOK] Erreur insertion payment_logs:", logError.message);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Transaction validée et enregistrée avec succès.",
          order_id,
          transaction_id: transaction_id || null,
          payment_status: "paid",
          recorded_at: nowIso,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Statut d'échec/annulation : journaliser et renvoyer 200 pour éviter des relances infinies de la passerelle
    await supabase
      .from("payment_logs")
      .insert({
        tenant_id: tenant_id || null,
        transaction_id: transaction_id || null,
        amount: numericAmount,
        status: cleanStatus,
        customer_phone: customer_phone || null,
        raw_payload: payload,
        created_at: nowIso,
      })
      .then(({ error }) => {
        if (error) console.warn("[PAYMENT-WEBHOOK] Erreur log échec:", error.message);
      });

    return new Response(
      JSON.stringify({
        success: true,
        acknowledged: true,
        order_id,
        transaction_id: transaction_id || null,
        status: cleanStatus,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[PAYMENT-WEBHOOK] Exception non interceptée:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur lors du traitement du Webhook." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
