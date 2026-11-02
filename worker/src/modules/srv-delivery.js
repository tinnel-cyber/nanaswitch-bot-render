/**
 * Module 17 : Livraisons & Suivi Heatmap en Direct - srv-delivery
 * Cache Edge des données de cartes thermiques et suivi des livraisons.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleDeliveryModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Vérification du Cache Edge pour les tuiles de cartes et heatmaps en lecture (GET)
  if (request.method === "GET" && (path.startsWith("/api/heatmap/") || path.includes("/tracking/public"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-DELIVERY-HEATMAP");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 2. Proxying vers le backend Render en cas de Cache Miss ou de mise à jour de position livreur (POST)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-delivery");

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
    responseHeaders.set("X-Served-By", "Nanasore-DeliveryService-Edge");

    // Cache Edge de 3 minutes pour les données statistiques de heatmaps et cartes de livraison
    if (request.method === "GET" && originResponse.status === 200 && path.startsWith("/api/heatmap/")) {
      responseHeaders.set("Cache-Control", "public, max-age=180, s-maxage=180");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le module de livraison & heatmaps." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
