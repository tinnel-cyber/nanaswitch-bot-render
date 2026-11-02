/**
 * Module 22 : Accélération Media WaMeet - srv-wameet-media
 * Démarrage instantané des Reels, Feed Reels et Live Résonnance via Edge Cache & KV.
 * Règle d'or : Manifestes HLS, Tokens & Chunks d'amorçage à l'Edge = 0 appel Render (<5ms).
 */

export async function handleWameetMediaModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Accélération Edge pour le Feed Reels & Métadonnées de Live (GET)
  if (request.method === "GET" && (path.includes("/reels/feed") || path.includes("/live/active-rooms") || path.includes("/manifest.m3u8"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-WAMEET-VIDEO");
      hitHeaders.set("Access-Control-Allow-Origin", "*");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }

    // Recherche d'amorçage instantané de Live dans Cloudflare KV (< 5 ms)
    if (path.includes("/live/active-rooms") && env.PRODUCT_STOCK_KV) {
      try {
        const liveRooms = await env.PRODUCT_STOCK_KV.get("wameet:live_rooms", { type: "json" });
        if (liveRooms) {
          return new Response(JSON.stringify(liveRooms), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=10, s-maxage=10",
              "X-Nanasore-Cache": "HIT-KV-WAMEET-LIVE",
              "X-Served-By": "Nanasore-WaMeetMedia-Edge",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      } catch (e) {
        // Poursuivre vers le proxying en cas d'erreur KV
      }
    }
  }

  // 2. Proxying vers le backend Render (pour la génération de sessions, création de Live ou upload de Reels)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-wameet-media");

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
    responseHeaders.set("X-Served-By", "Nanasore-WaMeetMedia-Edge");
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    // Cache Edge dynamique : 60s pour les Reels, 10s pour les manifestes de Live Résonnance
    if (request.method === "GET" && originResponse.status === 200) {
      if (path.includes("/reels/feed")) {
        responseHeaders.set("Cache-Control", "public, max-age=60, s-maxage=60");
        ctx.waitUntil(caches.default.put(request, originResponse.clone()));
      } else if (path.includes("/manifest.m3u8") || path.includes("/live/active-rooms")) {
        responseHeaders.set("Cache-Control", "public, max-age=10, s-maxage=10");
        ctx.waitUntil(caches.default.put(request, originResponse.clone()));
      }
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de connexion au service média WaMeet." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
