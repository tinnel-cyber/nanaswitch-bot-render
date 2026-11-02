/**
 * Module 22 : Conciergerie & Support VIP WhatsApp / Tickets - srv-vip-support
 * Routage prioritaire du support marchand, gestion des tickets et cache Edge de la FAQ/Statut VIP.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleVipSupportModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Interception du niveau de priorité VIP et identifiants de ticket
  const priorityTier = request.headers.get("X-Nanasore-VIP-Tier") || url.searchParams.get("priority") || "standard";
  const ticketId = url.searchParams.get("ticket_id") || (path.startsWith("/ticket/") ? path.split("/")[2] : null);

  // 2. Cache Edge pour la FAQ VIP, statuts et consultation des catégories de tickets (GET)
  if (request.method === "GET" && (path.includes("/faq") || path.includes("/status") || path.includes("/categories"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-VIP-SUPPORT");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 3. Forward vers Render avec marquage de priorité et module Ticket
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-vip-support");
  newHeaders.set("X-Nanasore-Priority", priorityTier);
  if (ticketId) {
    newHeaders.set("X-Nanasore-Ticket-ID", ticketId);
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
    responseHeaders.set("X-Served-By", "Nanasore-VipSupport-Edge");

    // Cache Edge de 10 minutes pour la FAQ, catégories de tickets et statuts
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/faq") || path.includes("/status") || path.includes("/categories"))) {
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
      JSON.stringify({ success: false, error: "Erreur de communication avec la Conciergerie & Système de Tickets VIP." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
