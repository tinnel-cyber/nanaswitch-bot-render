/**
 * Module 2 : Vitrine en Ligne (E-Shop) - app-studio (id: app-studio)
 * Gestion à l'Edge du routage de boutique, du cache Edge et de l'isolation tenant.
 */

export async function handleStudioModule(request, env, ctx) {
  const url = new URL(request.url);
  const hostname = url.hostname;
  const renderBackend = (env.RENDER_BACKEND_URL && env.RENDER_BACKEND_URL !== "nanasore.onrender.com" ? env.RENDER_BACKEND_URL : "pos-app-1759a.web.app");

  // 1. Détection du mode LECTURE (GET) pour l'Edge Caching (Cache Cloudflare)
  if (request.method === "GET") {
    const cache = caches.default;
    // Vérifier si la page ou l'asset est déjà en cache Edge
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: hitHeaders
      });
    }
  }

  // 2. Extraction du sous-domaine marchand (Tenant)
  let tenantId = null;
  if (hostname.endsWith(".nsore.shop")) {
    tenantId = hostname.replace(".nsore.shop", "");
  } else if (hostname.endsWith(".nanasore.com")) {
    tenantId = hostname.replace(".nanasore.com", "");
  }

  const reserved = ["www", "app", "api", "admin", "cdn"];
  if (tenantId && reserved.includes(tenantId)) {
    tenantId = null;
  }

  // 3. Préparation des en-têtes transférés à Render
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Forwarded-Host", hostname);
  newHeaders.set("X-Nanasore-Host", hostname);
  newHeaders.set("X-Nanasore-Module", "app-studio");

  if (tenantId) {
    newHeaders.set("X-Nanasore-Tenant", tenantId);
  }

  // 4. Proxying vers Render
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
    responseHeaders.set("X-Served-By", "Nanasore-Studio-Edge");

    // 5. Mise en cache Edge des requêtes GET réussies (HTML produits, CSS, JS, Images)
    if (request.method === "GET" && originResponse.status === 200) {
      // Stratégie de cache : 1 heure pour les pages/catalogue, 1 an pour les assets statiques
      if (url.pathname.startsWith("/build/") || url.pathname.startsWith("/assets/")) {
        responseHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        responseHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      }

      const responseToCache = new Response(originResponse.clone().body, {
        status: originResponse.status,
        statusText: originResponse.statusText,
        headers: responseHeaders,
      });

      ctx.waitUntil(caches.default.put(request, responseToCache));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur d'accès à la boutique vitrine Nanasore." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
