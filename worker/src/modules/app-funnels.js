/**
 * Module 9 : Automatisation & Funnels de Vente (Tunnels de conversion et tracking) - app-funnels
 * Gestion Edge du routage des tunnels et proxying des conversions.
 */

export async function handleFunnelsModule(request, env, ctx) {
  const url = new URL(request.url);
  const renderBackend = (env.RENDER_BACKEND_URL && env.RENDER_BACKEND_URL !== "nanasore.onrender.com" ? env.RENDER_BACKEND_URL : "nanasore.pages.dev");

  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "app-funnels");

  // Si c'est l'affichage d'une landing page publique de tunnel (GET), mise en cache Edge légère
  if (request.method === "GET" && url.pathname.startsWith("/funnel/")) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-FUNNEL-EDGE");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // Proxying vers le backend Render
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
    responseHeaders.set("X-Served-By", "Nanasore-Funnels-Edge");

    // Cache Edge de 5 minutes pour les pages de tunnels statiques
    if (request.method === "GET" && originResponse.status === 200 && url.pathname.startsWith("/funnel/")) {
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
      JSON.stringify({ success: false, error: "Erreur de communication avec le moteur de tunnels de vente." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
