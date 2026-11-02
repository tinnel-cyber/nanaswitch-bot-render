/**
 * Module 31 : Suivi Budgétaire & Trésorerie en Temps Réel - mod-treasury
 * Cache Edge ultra-rapide des synthèses budgétaires et indicateurs de trésorerie.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleTreasuryModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Vérification du Cache Edge pour les synthèses budgétaires et allocations financières (GET)
  if (request.method === "GET" && (path.includes("/summary") || path.includes("/allocations") || path.includes("/categories"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-TREASURY");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 2. Proxying vers le backend Render (pour enregistrement d'opérations de caisse, ajustements budgétaires)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "mod-treasury");

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
    responseHeaders.set("X-Served-By", "Nanasore-TreasuryService-Edge");

    // Cache Edge de 5 minutes pour les synthèses de trésorerie et tableaux budgétaires
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/summary") || path.includes("/allocations") || path.includes("/categories"))) {
      responseHeaders.set("Cache-Control", "public, max-age=300, s-maxage=300");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le module de Trésorerie & Budget." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
