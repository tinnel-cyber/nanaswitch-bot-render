/**
 * Module 28 : Générateur de Contrats & Signatures Numériques - mod-contracts
 * Cache Edge ultra-rapide des modèles de contrats, CGV et templates légaux.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleContractsModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Vérification du Cache Edge pour la consultation des templates de contrats et CGV (GET)
  if (request.method === "GET" && (path.includes("/templates") || path.includes("/cgv") || path.includes("/legal-info"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-CONTRACTS");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 2. Proxying vers le backend Render (pour signature électronique, génération et validation de contrat)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "mod-contracts");

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
    responseHeaders.set("X-Served-By", "Nanasore-ContractsService-Edge");

    // Cache Edge de 30 minutes pour les templates de contrats et documents légaux publics
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/templates") || path.includes("/cgv") || path.includes("/legal-info"))) {
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
      JSON.stringify({ success: false, error: "Erreur de communication avec le module de Génération de Contrats." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
