/**
 * Module 35 : Automatisation des Workflows & Triggers Cloud - srv-workflows
 * Cache Edge ultra-rapide des définitions et schémas d'automatisation.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleWorkflowsModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Vérification du Cache Edge pour les définitions et topologies de workflows (GET)
  if (request.method === "GET" && (path.includes("/definitions") || path.includes("/triggers-list") || path.includes("/schema"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-WORKFLOWS");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 2. Proxying vers le backend Render (pour l'exécution et le déclenchement de workflows)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-workflows");

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
    responseHeaders.set("X-Served-By", "Nanasore-WorkflowsService-Edge");

    // Cache Edge de 15 minutes pour les schémas et définitions d'automatisation
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/definitions") || path.includes("/triggers-list") || path.includes("/schema"))) {
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
      JSON.stringify({ success: false, error: "Erreur de communication avec le module Workflows & Automatisation." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
