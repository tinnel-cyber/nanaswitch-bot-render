/**
 * Module 36 : Gestion des Événements & Webhooks sortants - srv-webhooks
 * Cache Edge ultra-rapide des schémas de webhooks et catalogues d'événements.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleWebhooksModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = (env.RENDER_BACKEND_URL && env.RENDER_BACKEND_URL !== "nanasore.onrender.com" ? env.RENDER_BACKEND_URL : "nanasore.pages.dev");

  // 1. Vérification du Cache Edge pour les schémas de webhooks et catalogues d'événements (GET)
  if (request.method === "GET" && (path.includes("/schemas") || path.includes("/events-catalog") || path.includes("/config"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-WEBHOOKS");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 2. Proxying vers le backend Render (pour enregistrement d'endpoints, émission et retentatives de webhooks)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-webhooks");

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
    responseHeaders.set("X-Served-By", "Nanasore-WebhooksService-Edge");

    // Cache Edge de 30 minutes pour les schémas et configurations statiques
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/schemas") || path.includes("/events-catalog") || path.includes("/config"))) {
      responseHeaders.set("Cache-Control", "public, max-age=1800, s-maxage=1800");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le module Webhooks & Événements." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
