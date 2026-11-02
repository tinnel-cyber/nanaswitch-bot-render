import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabase } from "../../utils/supabase.server";

/**
 * Route API Remix : app/routes/api/sales.ts
 * Pont transactionnel pour l'encaissement de ventes (POS & E-commerce vitrine).
 * Appelle la fonction stockée PostgreSQL atomique process_sale_transaction.
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    let productId = "";
    let quantity = 1;
    let source = "pos";
    let organizationId: string | null = null;
    let unitPrice: number | null = null;
    let customerName: string | null = null;
    let customerPhone: string | null = null;
    let paymentMethod = "cash";
    let sellerName: string | null = null;
    let metadata: Record<string, unknown> = {};

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      productId = String(body.productId || body.product_id || "").trim();
      quantity = parseInt(String(body.quantity || "1"), 10);
      source = String(body.source || "pos").trim();
      organizationId = body.organizationId || body.organization_id || null;
      unitPrice = body.unitPrice ?? body.unit_price ?? null;
      customerName = body.customerName || body.customer_name || null;
      customerPhone = body.customerPhone || body.customer_phone || null;
      paymentMethod = String(body.paymentMethod || body.payment_method || "cash");
      sellerName = body.sellerName || body.seller_name || null;
      metadata = body.metadata || {};
    } else {
      const formData = await request.formData();
      productId = String(formData.get("productId") || formData.get("product_id") || "").trim();
      quantity = parseInt(String(formData.get("quantity") || "1"), 10);
      source = String(formData.get("source") || "pos").trim();
      organizationId = (formData.get("organizationId") || formData.get("organization_id")) as string | null;
      const rawPrice = formData.get("unitPrice") || formData.get("unit_price");
      unitPrice = rawPrice ? parseFloat(String(rawPrice)) : null;
      customerName = (formData.get("customerName") || formData.get("customer_name")) as string | null;
      customerPhone = (formData.get("customerPhone") || formData.get("customer_phone")) as string | null;
      paymentMethod = String(formData.get("paymentMethod") || formData.get("payment_method") || "cash");
      sellerName = (formData.get("sellerName") || formData.get("seller_name")) as string | null;
    }

    if (!productId) {
      return json({ success: false, error: "Le paramètre productId est obligatoire" }, { status: 400 });
    }

    if (isNaN(quantity) || quantity <= 0) {
      return json({ success: false, error: "La quantité doit être supérieure à zéro" }, { status: 400 });
    }

    // Appel de la procédure stockée PostgreSQL
    const { data, error } = await supabase.rpc("process_sale_transaction", {
      p_product_id: productId,
      p_quantity: quantity,
      p_source: source,
      p_org_id: organizationId,
      p_unit_price: unitPrice,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_payment_method: paymentMethod,
      p_seller_name: sellerName,
      p_metadata: metadata,
    });

    if (error) {
      // Retour propre de l'erreur SQL (ex: Stock insuffisant)
      return json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: 400 }
      );
    }

    return json({
      success: true,
      transaction: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne lors de la transaction";
    return json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * Loader pour lister l'historique récent des ventes
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get("organizationId");
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    let query = supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(limit);

    if (orgId) {
      query = query.eq("organization_id", orgId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return json({ success: true, sales: data || [] });
  } catch (err: any) {
    return json({ success: false, error: err.message, sales: [] }, { status: 500 });
  }
}
