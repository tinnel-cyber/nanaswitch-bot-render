/**
 * Module 5 : NaNa AI Studio & Avatars (Générateur de porte-paroles et avatars vidéo) - app-tinnela
 * Gestion du cache des configurations d'avatars et proxying vers le backend de rendu.
 */

export async function handleTinnelaModule(request, env, ctx) {
  const url = new URL(request.url);
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "app-nana-ai-studio");

  // Si c'est une requête de consultation de templates ou de miniatures d'avatars (GET), mise en cache Edge
  if (
    request.method === "GET" && 
    (url.pathname.includes("/tinnela/avatars/") || 
     url.pathname.includes("/nana-ai/avatars/") || 
     url.pathname.includes("/templates/"))
  ) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const cachedHeaders = new Headers(cachedResponse.headers);
      cachedHeaders.set("X-Nanasore-Cache", "HIT-NANA-AI-EDGE");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: cachedHeaders
      });
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
    responseHeaders.set("X-Served-By", "Nanasore-NanaAIStudio-Edge");

    // Cache Edge de 30 minutes pour les métadonnées statiques des avatars
    if (
      request.method === "GET" && 
      originResponse.status === 200 && 
      (url.pathname.includes("/tinnela/config/") || url.pathname.includes("/nana-ai/config/"))
    ) {
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
      JSON.stringify({ success: false, error: "Erreur de communication avec NaNa AI Studio." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
