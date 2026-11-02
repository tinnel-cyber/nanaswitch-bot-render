/**
 * Module 15 : Studio de Choix et Construction de Thèmes - srv-theme-builder
 * Injection à l'Edge des variables CSS et cache ultra-rapide des assets de thèmes.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleThemeBuilderModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Mise en cache Edge agressive des bundles CSS, JS et JSON de thèmes (GET)
  if (request.method === "GET" && (path.startsWith("/assets/themes/") || path.includes("/config"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-THEME-BUILDER");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 2. Transmettre au backend Render pour la compilation ou modification de thème
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-theme-builder");

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
    responseHeaders.set("X-Served-By", "Nanasore-ThemeBuilder-Edge");

    // Cache Edge de 1 heure (3600s) pour les bundles de thèmes statiques et configurations validées
    if (request.method === "GET" && originResponse.status === 200 && (path.startsWith("/assets/themes/") || path.includes("/config"))) {
      responseHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le serveur de thèmes Nanasore." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
