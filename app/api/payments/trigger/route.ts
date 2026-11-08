import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export interface PaymentTriggerPayload {
  transaction_id?: string;
  status: string;
  tenant_id?: string;
  amount?: number | string;
  customer_phone?: string;
  order_id: string;
  [key: string]: unknown;
}

/**
 * Route Handler POST Next.js (App Router)
 * Endpoint : /api/payments/trigger
 * 
 * Permet de déclencher ou simuler une notification de paiement en invoquant
 * directement l'Edge Function Supabase `payment-webhook`.
 */
export async function POST(request: NextRequest) {
  try {
    let payload: PaymentTriggerPayload;

    try {
      payload = await request.json();
    } catch (_parseErr) {
      return NextResponse.json(
        {
          success: false,
          error: "Corps de requête JSON invalide ou illisible.",
        },
        { status: 400 }
      );
    }

    const { order_id, status } = payload;

    // Validation des champs indispensables
    if (!order_id || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "Champs obligatoires manquants : 'order_id' et 'status' doivent être renseignés.",
          received: { order_id, status },
        },
        { status: 400 }
      );
    }

    // Invocation de l'Edge Function Supabase `payment-webhook`
    const { data, error } = await supabase.functions.invoke("payment-webhook", {
      body: payload,
    });

    if (error) {
      console.error("[API /api/payments/trigger] Erreur lors de l'appel à l'Edge Function :", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Erreur lors de l'invocation de l'Edge Function payment-webhook.",
        },
        { status: 500 }
      );
    }

    // Si l'Edge Function a renvoyé un statut d'échec métier (ex: paiement rejeté/échoué)
    if (data && data.success === false) {
      return NextResponse.json(data, { status: 400 });
    }

    // Réponse de succès
    return NextResponse.json(
      data ?? {
        success: true,
        message: "Paiement déclenché et traité avec succès.",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[API /api/payments/trigger] Exception non interceptée :", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Erreur interne du serveur lors du déclenchement du paiement.",
      },
      { status: 500 }
    );
  }
}
