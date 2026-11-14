/**
 * Module 26 : Gestion des Dettes & Ardoises Clients - mod-debts
 * Contrôle de plafond de crédit/dette à l'Edge (KV) et cache des relevés d'ardoise.
 * Règle d'or : Cache Edge / KV HIT = 0 requête vers Render.
 */

export async function handleDebtsModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = (env.RENDER_BACKEND_URL && env.RENDER_BACKEND_URL !== "nanasore.onrender.com" ? env.RENDER_BACKEND_URL : "nanasore.pages.dev");

  // 1. Contrôle rapide du plafond de dette client via KV Edge (ex: /api/debts/check-limit)
  if (path.includes("/check-limit") && env.PRODUCT_STOCK_KV) {
    const customerId = url.searchParams.get("customer_id");
    if (customerId) {
      try {
        const debtData = await env.PRODUCT_STOCK_KV.get(`debt:${customerId}`, { type: "json" });
        if (debtData) {
          const limitExceeded = debtData.current_debt >= debtData.max_credit_limit;
          return new Response(
            JSON.stringify({
              success: true,
              customer_id: customerId,
              current_debt: debtData.current_debt,
              max_credit_limit: debtData.max_credit_limit,
              credit_allowed: !limitExceeded,
              status: limitExceeded ? "CREDIT_LIMIT_EXCEEDED" : "CREDIT_APPROVED"
            }),
            {
              status: limitExceeded ? 403 : 200,
              headers: {
                "Content-Type": "application/json",
                "X-Nanasore-Cache": "HIT-KV-DEBT-CHECK"
              }
            }
          );
        }
      } catch (e) {
        // Fallback vers le backend Render en cas de problème de lecture KV
      }
    }
  }

  // 2. Cache Edge pour la consultation des états généraux d'ardoises et historiques d'échéances (GET)
  if (request.method === "GET" && (path.includes("/summary") || path.includes("/ledger-config"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-DEBTS-SUMMARY");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 3. Proxying vers le backend Render (pour remboursements, ajouts d'ardoise)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "mod-debts");

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
    responseHeaders.set("X-Served-By", "Nanasore-DebtsService-Edge");

    // Cache Edge de 10 minutes pour les métadonnées et synthèses d'ardoises
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/summary") || path.includes("/ledger-config"))) {
      responseHeaders.set("Cache-Control", "public, max-age=600, s-maxage=600");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le module de Gestion des Dettes." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
