import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * En-têtes CORS universels pour autoriser les appels Webhook & applications clientes
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WebhookPayload {
  transaction_id?: string;
  status?: string;
  tenant_id?: string;
  amount?: number | string;
  customer_phone?: string;
  order_id?: string;
  [key: string]: unknown;
}

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
    // 2. Initialisation du client Supabase avec la clé de rôle de service (Service Role Key)
    // Permet de contourner les politiques RLS pour l'écriture système sécurisée
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[PAYMENT-WEBHOOK] Variables d'environnement Supabase manquantes");
      return new Response(
        JSON.stringify({
          error: "Configuration serveur incomplète (SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant)",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 3. Réception et validation du body JSON
    let payload: WebhookPayload;
    try {
      payload = await req.json();
    } catch (_err) {
      return new Response(
        JSON.stringify({ error: "Corps de requête JSON invalide ou illisible" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      transaction_id,
      status,
      tenant_id,
      amount,
      customer_phone,
      order_id,
    } = payload;

    // Validation des paramètres minimaux requis
    if (!order_id || !status) {
      return new Response(
        JSON.stringify({
          error: "Champs obligatoires manquants : 'order_id' et 'status' sont requis.",
          received: { order_id, status },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const nowIso = new Date().toISOString();
    const cleanStatus = String(status).trim().toUpperCase();
    const isSuccess = cleanStatus === "SUCCESS" || cleanStatus === "COMPLETED";
    const numericAmount = typeof amount === "number" ? amount : parseFloat(String(amount || "0")) || 0;

    // 4. Traitement selon le statut du paiement
    if (isSuccess) {
      console.log(`[PAYMENT-WEBHOOK] Paiement réussi détecté pour la commande ${order_id} (Transaction: ${transaction_id})`);

      // A. Mise à jour de la commande dans la table `sales`
      // On cherche par identifiant direct ou par référence
      let salesQuery = supabase
        .from("sales")
        .update({
          payment_status: "paid",
          updated_at: nowIso,
        })
        .eq("id", order_id);

      // Si tenant_id est fourni, on filtre également par tenant/organisation si possible
      if (tenant_id) {
        salesQuery = salesQuery.or(`organization_id.eq.${tenant_id},metadata->>tenant_id.eq.${tenant_id}`);
      }

      const { data: updatedSales, error: updateError } = await salesQuery.select();

      if (updateError) {
        console.warn(`[PAYMENT-WEBHOOK] Avertissement mise à jour sales:`, updateError.message);
        // Si le filtre par tenant_id a échoué car le schéma diffère, on tente la mise à jour directe par id
        const { error: directUpdateError } = await supabase
          .from("sales")
          .update({
            payment_status: "paid",
            updated_at: nowIso,
          })
          .eq("id", order_id);

        if (directUpdateError) {
          console.error(`[PAYMENT-WEBHOOK] Erreur persistante mise à jour sales :`, directUpdateError);
        }
      }

      // B. Insertion de la trace d'audit dans `payment_logs`
      const { error: logError } = await supabase
        .from("payment_logs")
        .insert({
          tenant_id: tenant_id || null,
          transaction_id: transaction_id || null,
          amount: numericAmount,
          status: cleanStatus,
          customer_phone: customer_phone || null,
          raw_payload: payload,
          created_at: nowIso,
        });

      if (logError) {
        console.error("[PAYMENT-WEBHOOK] Erreur insertion payment_logs :", logError);
      }

      // Réponse HTTP 200 en cas de succès
      return new Response(
        JSON.stringify({
          success: true,
          message: "Transaction validée et enregistrée avec succès.",
          order_id,
          transaction_id: transaction_id || null,
          payment_status: "paid",
          recorded_at: nowIso,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // Cas de statut non abouti (FAILED, CANCELLED, REJECTED, EXPIRED, etc.)
      console.warn(`[PAYMENT-WEBHOOK] Statut de paiement non validé : ${cleanStatus} pour order_id ${order_id}`);

      // Enregistrement de l'échec dans les logs pour audit commerçant
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
        .catch((e: unknown) => console.warn("[PAYMENT-WEBHOOK] Erreur log échec :", e));

      return new Response(
        JSON.stringify({
          success: false,
          error: `Le statut de paiement n'est pas un succès (reçu : ${cleanStatus}).`,
          order_id,
          transaction_id: transaction_id || null,
          status: cleanStatus,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: any) {
    console.error("[PAYMENT-WEBHOOK] Exception non interceptée :", error);
    return new Response(
      JSON.stringify({
        error: "Erreur interne du serveur lors du traitement du Webhook",
        details: error?.message || String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
