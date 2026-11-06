/**
 * Module 34 : Moteur de Recherche Global & Indexation - srv-search-engine
 * Cache Edge ultra-rapide des requêtes de recherche et index de catalogues.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleSearchEngineModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = (env.RENDER_BACKEND_URL && env.RENDER_BACKEND_URL !== "nanasore.onrender.com" ? env.RENDER_BACKEND_URL : "pos-app-1759a.web.app");

  // 1. Vérification du Cache Edge pour les requêtes de recherche et index de catalogues (GET)
  if (request.method === "GET" && (path.includes("/query") || path.includes("/catalog-search") || path.includes("/suggestions"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-SEARCH-ENGINE");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 2. Proxying vers le backend Render (pour l'indexation de nouveaux produits ou requêtes complexes)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-search-engine");

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
    responseHeaders.set("X-Served-By", "Nanasore-SearchService-Edge");

    // Cache Edge de 10 minutes pour les résultats de recherche et suggestions
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/query") || path.includes("/catalog-search") || path.includes("/suggestions"))) {
      responseHeaders.set("Cache-Control", "public, max-age=600, s-maxage=600");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le module Moteur de Recherche." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
