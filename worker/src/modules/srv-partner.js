/**
 * Module 19 : Espace Partenaire & Affiliation - srv-partner
 * Interception des liens d'affiliation ?ref= à l'Edge en 0 ms et cache des dashboards.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handlePartnerModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = (env.RENDER_BACKEND_URL && env.RENDER_BACKEND_URL !== "nanasore.onrender.com" ? env.RENDER_BACKEND_URL : "nanasore.com");

  // 1. Interception du code d'affiliation (ex: ?ref=PARTNER123 ou /ref/PARTNER123)
  const refCode = url.searchParams.get("ref") || (path.startsWith("/ref/") ? path.split("/")[2] : null);

  // 2. Cache Edge pour les informations d'affiliation publiques et règles de commission (GET)
  if (request.method === "GET" && (path.includes("/program/info") || path.includes("/rules"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-PARTNER");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 3. Proxying vers le backend Render
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-partner");
  if (refCode) {
    newHeaders.set("X-Nanasore-Affiliate-Ref", refCode);
  }

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
    responseHeaders.set("X-Served-By", "Nanasore-PartnerService-Edge");

    // Injection du Cookie d'Affiliation à l'Edge si un refCode est détecté
    if (refCode) {
      responseHeaders.append(
        "Set-Cookie",
        `nanasore_ref=${refCode}; Path=/; Max-Age=2592000; Secure; SameSite=Lax`
      );
    }

    // Cache Edge de 15 minutes pour les programmes d'affiliation
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/program/info") || path.includes("/rules"))) {
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
      JSON.stringify({ success: false, error: "Erreur de communication avec le service d'affiliation Nanasore." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
