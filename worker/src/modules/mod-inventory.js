/**
 * Module 23 : Stock & Inventaire Intelligent - mod-inventory
 * Contrôle de seuil d'alerte stock à l'Edge (KV) et cache des grilles d'inventaire.
 * Règle d'or : Cache Edge / KV HIT = 0 requête vers Render.
 */

export async function handleInventoryModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = (env.RENDER_BACKEND_URL && env.RENDER_BACKEND_URL !== "nanasore.onrender.com" ? env.RENDER_BACKEND_URL : "nanasore.pages.dev");

  // 1. Vérification rapide des alertes de stock en KV Edge (ex: /api/inventory/alert-check)
  if (path.includes("/alert-check") && env.PRODUCT_STOCK_KV) {
    const productId = url.searchParams.get("product_id");
    if (productId) {
      try {
        const stockData = await env.PRODUCT_STOCK_KV.get(`stock:${productId}`, { type: "json" });
        if (stockData) {
          const isCritical = stockData.quantity <= (stockData.min_threshold || 5);
          return new Response(
            JSON.stringify({
              success: true,
              product_id: productId,
              stock: stockData.quantity,
              is_critical: isCritical,
              alert: isCritical ? "CRITICAL_STOCK_ALERT" : "NORMAL"
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "X-Nanasore-Cache": "HIT-KV-INVENTORY-ALERT"
              }
            }
          );
        }
      } catch (e) {
        // Fallback vers Render en cas d'erreur KV
      }
    }
  }

  // 2. Cache Edge pour la consultation de la grille d'inventaire globale ou des rapports (GET)
  if (request.method === "GET" && (path.includes("/grid") || path.includes("/catalog-stock"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-INVENTORY-GRID");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 3. Proxying vers le backend Render
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "mod-inventory");

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
    responseHeaders.set("X-Served-By", "Nanasore-InventoryService-Edge");

    // Cache Edge de 5 minutes pour les grilles d'inventaire globales
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/grid") || path.includes("/catalog-stock"))) {
      responseHeaders.set("Cache-Control", "public, max-age=300, s-maxage=300");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le module Inventaire & Stock." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
