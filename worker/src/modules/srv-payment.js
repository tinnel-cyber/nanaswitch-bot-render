/**
 * Module 18 : Passerelles de Paiement Mobile Money - srv-payment
 * Validation express des signatures de webhooks et paiements Mobile Money à l'Edge.
 * Règle d'or : Sécurité Edge = 0 requête vers Render si signature invalide.
 */

export async function handlePaymentModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Validation de la signature ou du token de callback pour les webhooks Mobile Money
  if (path.startsWith("/webhooks/payment/") || path.includes("/callback")) {
    const paymentSignature = request.headers.get("X-Nanasore-Pay-Signature") || request.headers.get("X-Signature");
    
    // Si la signature critique est manquante sur un callback externe, rejet immédiat
    if (!paymentSignature && request.method === "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "INVALID_PAYMENT_SIGNATURE",
          message: "Signature de passerelle de paiement absente ou non valide."
        }),
        { status: 403, headers: { "Content-Type": "application/json", "X-Nanasore-Edge": "Blocked-Unsigned-Payment" } }
      );
    }
  }

  // 2. Cache Edge pour les configurations publiques de passerelles (GET)
  if (request.method === "GET" && path.includes("/gateways/config")) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-PAYMENT-CONFIG");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 3. Proxying vers Render pour l'initiation et la validation effective des transactions
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-payment");

  const targetUrl = new URL(request.url);
  targetUrl.hostname = renderBackend;
  targetUrl.protocol = "https:";

  const proxyRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers: newHeaders,
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    redirect: "manual",
  });

  try {
    const originResponse = await fetch(proxyRequest);
    const responseHeaders = new Headers(originResponse.headers);
    responseHeaders.set("X-Served-By", "Nanasore-PaymentService-Edge");

    // Cache Edge de 15 minutes pour les configurations des passerelles de paiement
    if (request.method === "GET" && originResponse.status === 200 && path.includes("/gateways/config")) {
      responseHeaders.set("Cache-Control", "public, max-age=900, s-maxage=900");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec la passerelle Mobile Money." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
