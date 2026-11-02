/**
 * Module 27 : Gestionnaire de Campagnes d'Affichage & Publicités Intégrées - mod-ads-manager
 * Cache Edge ultra-rapide des bannières publicitaires et configurations de campagnes.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleAdsManagerModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Vérification du Cache Edge pour la récupération des bannières et listes de publicités actives (GET)
  if (request.method === "GET" && (path.includes("/banners") || path.includes("/active-list"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-ADS-MANAGER");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 2. Proxying vers le backend Render (pour création ou modification de campagnes publicitaires)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "mod-ads-manager");

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
    responseHeaders.set("X-Served-By", "Nanasore-AdsManager-Edge");

    // Cache Edge de 15 minutes pour les bannières publicitaires et listes de diffusion
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/banners") || path.includes("/active-list"))) {
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
      JSON.stringify({ success: false, error: "Erreur de communication avec le module de Gestion Publicitaire." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
