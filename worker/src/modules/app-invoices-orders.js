/**
 * Module 13 : Bons de Commande & Devis / Projets - app-invoices-orders
 * Sécurisation, vérification d'expiration et cache Edge des devis et bons de commande.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleInvoicesOrdersModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Contrôle préalable des liens publics d'accès aux devis / commandes
  if (path.startsWith("/quote/") || path.startsWith("/order/")) {
    const accessKey = url.searchParams.get("key") || url.searchParams.get("id");
    if (!accessKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "UNAUTHORIZED_ORDER_ACCESS",
          message: "Clé d'accès au document ou devis manquante."
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 2. Vérification du Cache Edge pour les requêtes en LECTURE (GET)
  if (request.method === "GET") {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-INVOICES-ORDERS");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 3. Proxying vers Render en cas de Cache Miss
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "app-invoices-orders");

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
    responseHeaders.set("X-Served-By", "Nanasore-InvoicesOrders-Edge");

    // Cache Edge de 15 minutes pour les devis et bons de commande publics validés
    if (request.method === "GET" && originResponse.status === 200 && (path.startsWith("/quote/") || path.startsWith("/order/"))) {
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
      JSON.stringify({ success: false, error: "Erreur lors du traitement du devis ou du bon de commande." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
