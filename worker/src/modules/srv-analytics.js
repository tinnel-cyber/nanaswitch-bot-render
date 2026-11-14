/**
 * Module 33 : Tableau de Bord Analytique & Statistiques - srv-analytics
 * Cache Edge ultra-rapide des métriques, KPI et rapports de vente agrégés.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleAnalyticsModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = (env.RENDER_BACKEND_URL && env.RENDER_BACKEND_URL !== "nanasore.onrender.com" ? env.RENDER_BACKEND_URL : "nanasore.pages.dev");

  // 1. Vérification du Cache Edge pour les KPI et rapports analytiques (GET)
  if (request.method === "GET" && (path.includes("/kpi") || path.includes("/overview") || path.includes("/sales-report"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-ANALYTICS");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 2. Proxying vers le backend Render (pour l'enregistrement d'événements de tracking ou requêtes analytiques dynamiques)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-analytics");

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
    responseHeaders.set("X-Served-By", "Nanasore-AnalyticsService-Edge");

    // Cache Edge de 10 minutes pour les rapports KPI et tableaux de bord
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/kpi") || path.includes("/overview") || path.includes("/sales-report"))) {
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
      JSON.stringify({ success: false, error: "Erreur de communication avec le module Analytique." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
