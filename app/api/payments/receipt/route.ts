import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export interface ReceiptRequestPayload {
  orderId: string;
  transactionId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  storeName: string;
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
  storeCity?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total?: number;
    isDigital?: boolean;
    downloadUrl?: string;
    fileKey?: string;
    category?: string;
  }>;
  totalAmount: number;
  currency?: string;
  paymentMethod?: string;
  downloadUrl?: string;
  clientDashboardUrl?: string;
  [key: string]: unknown;
}

/**
 * Route Handler POST Next.js (App Router)
 * Endpoint : /api/payments/receipt
 * 
 * Génère et consigne le reçu de paiement officiel du client, incluant les
 * informations de la boutique, le récapitulatif complet de tous les achats,
 * et les accès directs aux produits numériques (liens pré-signés et Espace Client).
 */
export async function POST(request: NextRequest) {
  try {
    let payload: ReceiptRequestPayload;

    try {
      payload = await request.json();
    } catch (_parseErr) {
      return NextResponse.json(
        { success: false, error: "Corps de requête JSON invalide ou illisible." },
        { status: 400 }
      );
    }

    const {
      orderId,
      transactionId,
      customerName,
      customerPhone,
      customerEmail,
      storeName,
      storePhone,
      storeEmail,
      storeAddress,
      storeCity,
      items,
      totalAmount,
      paymentMethod = "Mobile Money",
      downloadUrl,
      clientDashboardUrl
    } = payload;

    if (!orderId || !storeName) {
      return NextResponse.json(
        {
          success: false,
          error: "Champs obligatoires manquants : 'orderId' et 'storeName' sont requis.",
        },
        { status: 400 }
      );
    }

    const host = request.headers.get("host") || "nanasore.com";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const effectiveDownloadUrl = downloadUrl 
      ? (downloadUrl.startsWith("http") ? downloadUrl : `${baseUrl}${downloadUrl.startsWith("/") ? "" : "/"}${downloadUrl}`)
      : `${baseUrl}/download/${orderId}`;

    const effectiveDashboardUrl = clientDashboardUrl
      ? (clientDashboardUrl.startsWith("http") ? clientDashboardUrl : `${baseUrl}${clientDashboardUrl.startsWith("/") ? "" : "/"}${clientDashboardUrl}`)
      : `${baseUrl}/client/dashboard`;

    const nowIso = new Date().toISOString();
    const receiptId = `REC-${orderId}-${Date.now().toString(36).toUpperCase()}`;

    // 1. Audit et consignation dans `payment_logs`
    try {
      await supabase.from("payment_logs").insert({
        transaction_id: transactionId || orderId,
        amount: totalAmount || 0,
        status: "RECEIPT_ISSUED",
        customer_phone: customerPhone || null,
        raw_payload: {
          receiptId,
          orderId,
          customerName,
          customerEmail,
          storeName,
          storePhone,
          itemsCount: items?.length || 0,
          effectiveDownloadUrl,
          effectiveDashboardUrl,
          issuedAt: nowIso
        },
        created_at: nowIso,
      });
    } catch (dbErr) {
      console.warn("[API /api/payments/receipt] Note journalisation :", dbErr);
    }

    // 2. Envoi automatique par email transactionnel si customerEmail est fourni et Brevo disponible
    let emailDispatched = false;
    const brevoApiKey = process.env.BREVO_API_KEY || process.env.VITE_BREVO_SMTP_KEY;

    if (customerEmail && customerEmail.includes("@") && brevoApiKey) {
      try {
        const hasDigital = items?.some(
          (i) => i.isDigital || i.downloadUrl || i.fileKey || (i.category || "").toLowerCase().includes("digital")
        );

        const itemsRows = (items || [])
          .map(
            (it) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; font-weight: 600; color: #1e293b;">
              ${it.name} ${it.isDigital ? '<span style="color: #2563eb; font-size: 11px;">[Produit Numérique]</span>' : ''}
            </td>
            <td style="padding: 10px 0; text-align: center; color: #64748b;">${it.quantity || 1}</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #0f172a;">
              ${((it.total || it.price * (it.quantity || 1)) || 0).toLocaleString("fr-FR")} F CFA
            </td>
          </tr>
        `
          )
          .join("");

        const digitalSectionHtml = hasDigital
          ? `
          <div style="margin-top: 24px; padding: 20px; background-color: #eef2ff; border-radius: 16px; border: 1px solid #c7d2fe; text-align: center;">
            <h3 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 16px; font-weight: 800;">
              ⚡ Vos Accès Produits Numériques
            </h3>
            <p style="margin: 0 0 16px 0; color: #334155; font-size: 13px;">
              Votre lien de téléchargement direct est actif et sécurisé.
            </p>
            <div style="margin-bottom: 14px;">
              <a href="${effectiveDownloadUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">
                📥 Télécharger mon Produit Numérique
              </a>
            </div>
            <div>
              <a href="${effectiveDashboardUrl}" style="color: #4338ca; font-size: 12px; font-weight: 600; text-decoration: underline;">
                Accéder à mon Espace Client & Bibliothèque
              </a>
            </div>
            <p style="margin: 14px 0 0 0; color: #64748b; font-size: 11px;">
              ⏳ Lien pré-signé sécurisé (validité 1 heure). Vous pouvez régénérer vos accès à vie sur votre Espace Client.
            </p>
          </div>
        `
          : "";

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px;">
            <div style="border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 20px; color: #0f172a; font-weight: 800;">${storeName.toUpperCase()}</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">
                ${storeAddress || storeCity ? `${storeAddress || storeCity} • ` : ""}Tél : ${storePhone || "Support Boutique"}
              </p>
            </div>

            <div style="background-color: #f8fafc; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 6px;">
                <span><strong>Réf. Commande :</strong> #${orderId}</span>
                <span><strong>Date :</strong> ${new Date().toLocaleDateString("fr-FR")}</span>
              </div>
              <div style="font-size: 13px; color: #475569;">
                <span><strong>Client :</strong> ${customerName || "Cher client"} ${customerPhone ? `(${customerPhone})` : ""}</span>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
              <thead>
                <tr style="border-bottom: 2px solid #cbd5e1; text-align: left; color: #475569; font-size: 12px; text-transform: uppercase;">
                  <th style="padding-bottom: 8px;">Article</th>
                  <th style="padding-bottom: 8px; text-align: center;">Qté</th>
                  <th style="padding-bottom: 8px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div style="text-align: right; margin-bottom: 24px; padding-top: 10px; border-top: 2px solid #e2e8f0;">
              <span style="font-size: 14px; color: #475569;">Total Réglé : </span>
              <span style="font-size: 20px; font-weight: 900; color: #059669;">${(totalAmount || 0).toLocaleString("fr-FR")} F CFA</span>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Règlement via ${paymentMethod} • Statut : VALIDÉ</div>
            </div>

            ${digitalSectionHtml}

            <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 11px;">
              Merci de votre commande chez <strong>${storeName}</strong>.<br/>
              Pour toute question, contactez-nous au ${storePhone || "notre service client"}.
            </div>
          </div>
        `;

        const brevoPayload = {
          sender: {
            name: storeName,
            email: process.env.BREVO_SENDER_EMAIL || "notifications@nanasore.com"
          },
          to: [{ email: customerEmail, name: customerName || "Client" }],
          subject: `🧾 Reçu de paiement et accès à vos achats • #${orderId} - ${storeName}`,
          htmlContent: emailHtml
        };

        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            accept: "application/json",
            "api-key": brevoApiKey,
            "content-type": "application/json"
          },
          body: JSON.stringify(brevoPayload)
        });

        if (brevoRes.ok) {
          emailDispatched = true;
        }
      } catch (mailErr) {
        console.warn("[API /api/payments/receipt] Erreur envoi Brevo :", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Reçu de paiement généré et consigné avec succès.",
      receiptId,
      orderId,
      emailDispatched,
      downloadUrl: effectiveDownloadUrl,
      clientDashboardUrl: effectiveDashboardUrl
    });
  } catch (err: any) {
    console.error("[API /api/payments/receipt] Exception serveur :", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Erreur interne lors de la génération du reçu.",
      },
      { status: 500 }
    );
  }
}
