/**
 * Module 16 : Campagnes Marketing & SMS Directs - srv-sms
 * Vérification du solde du wallet SMS/marketing à l'Edge et blocage instantané si épuisé.
 * Règle d'or : Cache Edge ou Contrôle de solde = 0 requête vers Render si rejeté.
 */

export async function handleSmsModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Contrôle préalable du solde SMS du marchand via KV Edge (si l'en-tête de tenant est fourni)
  if (request.method === "POST" && (path.includes("/send") || path.includes("/campaign"))) {
    const tenantId = request.headers.get("X-Nanasore-Tenant");
    if (tenantId && env.PRODUCT_STOCK_KV) {
      try {
        const walletData = await env.PRODUCT_STOCK_KV.get(`wallet:sms:${tenantId}`, { type: "json" });
        if (walletData && walletData.balance <= 0) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "INSUFFICIENT_SMS_CREDIT",
              message: "Votre solde de crédits SMS est épuisé. Veuillez recharger votre wallet."
            }),
            { status: 402, headers: { "Content-Type": "application/json", "X-Nanasore-Edge": "Blocked-Zero-Balance" } }
          );
        }
      } catch (e) {
        // En cas d'erreur de lecture KV, on laisse passer vers le backend par sécurité
      }
    }
  }

  // 2. Vérification du cache Edge pour les templates de campagnes (GET)
  if (request.method === "GET" && path.includes("/templates")) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-SMS-TEMPLATE");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 3. Proxying vers le backend Render
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-sms");

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
    responseHeaders.set("X-Served-By", "Nanasore-SmsService-Edge");

    // Cache Edge de 10 minutes pour les templates de campagnes marketing
    if (request.method === "GET" && originResponse.status === 200 && path.includes("/templates")) {
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
      JSON.stringify({ success: false, error: "Erreur de communication avec le service SMS & Marketing." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
