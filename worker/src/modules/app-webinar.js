/**
 * Module 11 : Studio de Génération de Live & Webinaire - app-webinar
 * Aiguillage à basse latence des flux et cache Edge des métadonnées de webinaires.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleWebinarModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = (env.RENDER_BACKEND_URL && env.RENDER_BACKEND_URL !== "nanasore.onrender.com" ? env.RENDER_BACKEND_URL : "pos-app-1759a.web.app");

  // 1. Vérification du Cache Edge pour les pages de webinaires publiques ou métadonnées (GET)
  if (request.method === "GET" && (path.startsWith("/webinar/") || path.includes("/api/webinar/metadata"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-WEBINAR");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 2. Préparation du proxy vers Render pour les actions dynamiques (inscription, chat, démarrage de live)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "app-webinar");

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
    responseHeaders.set("X-Served-By", "Nanasore-Webinar-Edge");

    // Cache Edge de 2 minutes pour les métadonnées de webinaires en GET réussis
    if (request.method === "GET" && originResponse.status === 200 && path.startsWith("/webinar/")) {
      responseHeaders.set("Cache-Control", "public, max-age=120, s-maxage=120");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le studio Live & Webinaire." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
