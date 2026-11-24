import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sms-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function extractTransactionId(message: string): string {
  if (!message) return "";
  const cleanMsg = message.replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ").trim();
  if (/^[A-Za-z0-9._-]{5,35}$/.test(cleanMsg) && !/\s/.test(cleanMsg)) {
    return cleanMsg;
  }

  const patterns = [
    /(?:trans(?:action)?\s*id|id\s*(?:de\s*(?:la\s*)?)?trans(?:action)?|txn?\s*id|code\s*(?:de\s*)?trans(?:action)?|num(?:[eé]ro)?\s*(?:de\s*)?trans(?:action)?|identifiant)\s*[:.]?\s*([A-Za-z0-9._-]+)/i,
    /(?:r[eé]f(?:[eé]rence)?|r[eé]f\s*paiement|r[eé]f\s*tx)\s*[:.]?\s*([A-Za-z0-9._-]+)/i,
    /\b(?:id)\s*[:]\s*([A-Za-z0-9._-]{5,35})/i,
    /\b((?:CI|MP|PP|OM|BF|SN|ML|BJ|CG)\d{6,}\.[A-Za-z0-9._-]+)\b/i,
    /\b((?:CI|MP|PP|OM|BF|SN|ML|BJ|CG)[0-9]{8,}[A-Za-z0-9._-]*)\b/i,
    /\b(WAV(?:E)?-[A-Za-z0-9_-]+)\b/i,
    /\b(01[0-9A-HJ-KM-NP-TV-Z]{24})\b/i,
    /\b(T[A-Z0-9]{8,24})\b/,
    /(?:trans(?:action)?|r[eé]f[eé]rence|r[eé]f)\s*[:.]?\s*([0-9]{8,20})\b/i,
    /\b([A-Z0-9]{2,8}\.[0-9]{4,}\.[A-Z0-9]{3,})\b/i,
  ];

  for (const pattern of patterns) {
    const match = cleanMsg.match(pattern);
    if (match?.[1]) {
      const candidate = match[1].trim().replace(/[.,;:]$/, "");
      if (candidate.length >= 4) return candidate;
    }
  }
  return "";
}

function extractAmount(message: string): number {
  if (!message) return 0;
  const normalized = message
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ")
    .replace(/(\d+)[\.,]0{1,2}(?!\d)/g, "$1")
    .replace(/(\d)[\s\.,](\d{3})\b/g, "$1$2");

  const matchWithCurrency = normalized.match(/(\d{2,10})\s*(?:FCFA|F\s*CFA|XOF|F\b)/i);
  if (matchWithCurrency?.[1]) {
    return Number(matchWithCurrency[1]) || 0;
  }

  const matchAfterKeyword = normalized.match(/(?:recu|reçu|montant|paiement|envoy[eé]|credit[eé])\s*(?:de|:)?\s*(\d{2,10})/i);
  if (matchAfterKeyword?.[1]) {
    return Number(matchAfterKeyword[1]) || 0;
  }

  return 0;
}

function detectOperator(message: string, sender: string, explicitOp?: string): string {
  if (explicitOp) return String(explicitOp).toUpperCase();
  const combined = `${message} ${sender}`.toLowerCase();
  if (combined.includes("wave") || combined.includes("wav-")) return "WAVE";
  if (combined.includes("moov")) return "MOOV_MONEY";
  return "ORANGE_MONEY";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const configuredSecret = Deno.env.get("BF_SMS_WEBHOOK_SECRET") || Deno.env.get("PAYMENT_WEBHOOK_SECRET") || "";
    const providedSecret = req.headers.get("x-sms-secret") || url.searchParams.get("secret") || "";

    if (configuredSecret && providedSecret !== configuredSecret) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized SMS webhook secret" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const contentType = req.headers.get("content-type") || "";
    let body: Record<string, unknown> = {};
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        body[key] = String(value);
      });
    } else {
      body = await req.json().catch(() => ({}));
    }

    const rawSms = String(
      body.message || body.body || body.text || body.sms_body || body.sms || body.content || body.msg || ""
    ).trim();
    const sender = String(body.sender || body.expediteur || body.from || body.phone || "").trim();

    const transactionId = String(
      body.transaction_id || body.transactionId || extractTransactionId(rawSms)
    ).trim().toUpperCase();

    const amount = Number(body.amount || extractAmount(rawSms) || 0);
    const operator = detectOperator(rawSms, sender, body.operator ? String(body.operator) : undefined);
    const merchantCode = String(
      body.merchant_code || body.merchantCode || url.searchParams.get("merchant_code") || ""
    ).trim() || null;

    if (!transactionId || amount <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          ignored: true,
          reason: !transactionId ? "NO_TRANSACTION_ID_FOUND" : "INVALID_OR_MISSING_AMOUNT",
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ success: false, error: "Supabase service credentials missing" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("bf_sms_payments")
      .upsert(
        {
          transaction_id: transactionId,
          operator,
          amount,
          currency: String(body.currency || "XOF").toUpperCase(),
          sender_phone: sender || null,
          merchant_code: merchantCode,
          raw_sms: rawSms || null,
          status: "unmatched",
        },
        { onConflict: "transaction_id", ignoreDuplicates: true }
      )
      .select("id, transaction_id, amount, operator, status")
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transactionId,
        amount,
        operator,
        inserted: Boolean(data),
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
