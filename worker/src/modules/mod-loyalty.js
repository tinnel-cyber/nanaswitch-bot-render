/**
 * Module 32 : Programme de Fidélisation & Récompenses VIP - mod-loyalty
 * Cache Edge ultra-rapide des barèmes de fidélité, points et paliers VIP.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleLoyaltyModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Vérification du Cache Edge pour les barèmes de fidélité et paliers de récompense (GET)
  if (request.method === "GET" && (path.includes("/rules") || path.includes("/tiers") || path.includes("/rewards-catalog"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-LOYALTY");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 2. Proxying vers le backend Render (pour attribution de points, échange de récompenses, mise à jour de statut)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "mod-loyalty");

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
    responseHeaders.set("X-Served-By", "Nanasore-LoyaltyService-Edge");

    // Cache Edge de 20 minutes pour les barèmes de fidélité et catalogues de récompenses
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/rules") || path.includes("/tiers") || path.includes("/rewards-catalog"))) {
      responseHeaders.set("Cache-Control", "public, max-age=1200, s-maxage=1200");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le module de Fidélité & Récompenses." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
