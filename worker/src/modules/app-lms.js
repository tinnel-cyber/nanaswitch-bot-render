/**
 * Module 8 : Académie & Formation LMS (Gestion des cours et vidéos) - app-lms
 * Cache Edge des ressources pédagogiques et proxying vers le serveur LMS.
 */

export async function handleLMSModule(request, env, ctx) {
  const url = new URL(request.url);
  const renderBackend = (env.RENDER_BACKEND_URL && env.RENDER_BACKEND_URL !== "nanasore.onrender.com" ? env.RENDER_BACKEND_URL : "nanasore.com");

  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "app-lms");

  // 1. Cache Edge sur le catalogue de cours et les syllabus publics (GET)
  if (request.method === "GET" && (url.pathname.includes("/courses/public/") || url.pathname.includes("/catalog/"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-LMS-EDGE");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 2. Proxying vers le backend Render (Remix / WordPress / Tutor LMS backend)
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
    responseHeaders.set("X-Served-By", "Nanasore-LMS-Edge");

    // Cache Edge de 15 minutes pour le catalogue des formations
    if (request.method === "GET" && originResponse.status === 200 && url.pathname.includes("/courses/public/")) {
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
      JSON.stringify({ success: false, error: "Erreur de connexion à l'Académie Nanasore." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
