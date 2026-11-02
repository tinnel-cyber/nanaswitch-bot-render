/**
 * Module 20 : Centre de Création de Cours et Formations - srv-course-create
 * Cache Edge de l'arborescence des chapitres et structures LMS.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleCourseCreateModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Vérification du Cache Edge pour la consultation de la structure des cours (GET)
  if (request.method === "GET" && (path.includes("/structure") || path.startsWith("/courses/"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-COURSE-CREATE");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 2. Proxying vers le backend Render pour les créations ou modifications de chapitres (POST/PUT/DELETE)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-course-create");

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
    responseHeaders.set("X-Served-By", "Nanasore-CourseCreate-Edge");

    // Cache Edge de 20 minutes pour les structures de cours validées
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/structure") || path.startsWith("/courses/"))) {
      responseHeaders.set("Cache-Control", "public, max-age=1200, s-maxage=1200");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le Centre de Création de Cours." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
