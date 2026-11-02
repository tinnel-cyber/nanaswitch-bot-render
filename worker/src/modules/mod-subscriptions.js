/**
 * Module 25 : Facturation Récurrente & Abonnements - mod-subscriptions
 * Vérification de statut d'abonnement à l'Edge (KV) et cache des plans tarifaires.
 * Règle d'or : Cache Edge / KV HIT = 0 requête vers Render.
 */

export async function handleSubscriptionsModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Contrôle rapide du statut d'abonnement d'un tenant via KV Edge (ex: /api/subscriptions/status-check)
  if (path.includes("/status-check") && env.PRODUCT_STOCK_KV) {
    const tenantId = request.headers.get("X-Nanasore-Tenant") || url.searchParams.get("tenant_id");
    if (tenantId) {
      try {
        const subData = await env.PRODUCT_STOCK_KV.get(`sub:${tenantId}`, { type: "json" });
        if (subData) {
          return new Response(
            JSON.stringify({
              success: true,
              tenant_id: tenantId,
              status: subData.status, // "active", "past_due", "canceled"
              plan: subData.plan,
              expires_at: subData.expires_at
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "X-Nanasore-Cache": "HIT-KV-SUBSCRIPTION-STATUS"
              }
            }
          );
        }
      } catch (e) {
        // Fallback vers Render en cas d'erreur de lecture KV
      }
    }
  }

  // 2. Cache Edge pour la consultation des plans d'abonnement et grilles tarifaires (GET)
  if (request.method === "GET" && (path.includes("/plans") || path.includes("/pricing"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-SUBSCRIPTION-PLANS");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 3. Proxying vers le backend Render (pour souscription, paiement, annulation)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "mod-subscriptions");

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
    responseHeaders.set("X-Served-By", "Nanasore-SubscriptionsService-Edge");

    // Cache Edge de 1 heure pour les plans d'abonnement et grilles de tarifs publics
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/plans") || path.includes("/pricing"))) {
      responseHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le module d'abonnements & facturation." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
