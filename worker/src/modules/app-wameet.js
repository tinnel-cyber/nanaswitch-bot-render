/**
 * Module 3 : Wameet (Réseau Social Pro & Messagerie Marchands) - app-wameet
 * Gestion du cache edge des assets sociaux et filtrage des requêtes de flux.
 */

export async function handleWameetModule(request, env, ctx) {
  const url = new URL(request.url);
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "app-wameet");

  // Si c'est un GET sur les assets (stories, avatars, images de profil), mise en cache Edge agressive
  if (request.method === "GET" && (url.pathname.includes("/avatars/") || url.pathname.includes("/stories/"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  // Proxy vers le backend Render
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
    responseHeaders.set("X-Served-By", "Nanasore-Wameet-Edge");

    // Cache Edge de 10 minutes pour les médias sociaux statiques
    if (request.method === "GET" && originResponse.status === 200 && url.pathname.includes("/wameet/media/")) {
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
      JSON.stringify({ success: false, error: "Erreur de communication avec le module Wameet." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
