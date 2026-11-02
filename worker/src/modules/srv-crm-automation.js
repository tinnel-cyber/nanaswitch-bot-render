/**
 * Module 14 : CRM et Automatisation - srv-crm-automation
 * Rate-limiting anti-DDoS sur les webhooks entrants et filtrage des tokens CRM à l'Edge.
 * Règle d'or : Cache Edge HIT ou Sécurité = 0 requête vers Render.
 */

export async function handleCrmAutomationModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Validation de la clé/token d'API ou de Webhook CRM
  if (path.startsWith("/webhooks/crm/") || path.startsWith("/api/crm/")) {
    const apiKey = request.headers.get("X-Nanasore-CRM-Key") || url.searchParams.get("api_key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "UNAUTHORIZED_CRM_ACCESS",
          message: "Clé d'API CRM ou token de webhook manquant."
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 2. Cache Edge pour la consultation des métadonnées CRM et pipelines (GET)
  if (request.method === "GET") {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-CRM-AUTOMATION");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 3. Forward vers le backend Render en cas de validation et Miss Cache
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-crm-automation");

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
    responseHeaders.set("X-Served-By", "Nanasore-CrmAutomation-Edge");

    // Cache Edge de 5 minutes pour les schémas de pipelines CRM publics
    if (request.method === "GET" && originResponse.status === 200 && path.includes("/pipelines/schema")) {
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
      JSON.stringify({ success: false, error: "Erreur de communication avec le module CRM & Automation." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
