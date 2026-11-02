/**
 * Module 24 : Système de Réservation & Rendez-vous - mod-booking
 * Vérification ultra-rapide des créneaux horaires à l'Edge et cache des calendriers.
 * Règle d'or : Cache Edge / KV HIT = 0 requête vers Render.
 */

export async function handleBookingModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Vérification Edge de disponibilité rapide d'un créneau via Cloudflare KV
  if (path.includes("/check-slot") && env.PRODUCT_STOCK_KV) {
    const slotId = url.searchParams.get("slot_id");
    const merchantId = url.searchParams.get("merchant_id");
    if (slotId && merchantId) {
      try {
        const slotStatus = await env.PRODUCT_STOCK_KV.get(`booking:${merchantId}:${slotId}`, { type: "json" });
        if (slotStatus) {
          return new Response(
            JSON.stringify({
              success: true,
              slot_id: slotId,
              available: slotStatus.available,
              reason: slotStatus.available ? "SLOT_AVAILABLE" : "SLOT_BOOKED"
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "X-Nanasore-Cache": "HIT-KV-BOOKING-SLOT"
              }
            }
          );
        }
      } catch (e) {
        // Fallback vers le backend Render
      }
    }
  }

  // 2. Cache Edge pour les agendas et calendriers publics (GET)
  if (request.method === "GET" && (path.includes("/calendar") || path.includes("/slots"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-BOOKING-CALENDAR");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 3. Proxying vers le backend Render (pour création/annulation de RDV)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "mod-booking");

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
    responseHeaders.set("X-Served-By", "Nanasore-BookingService-Edge");

    // Cache Edge de 10 minutes pour les calendriers et vues de plages horaires publiques
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/calendar") || path.includes("/slots"))) {
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
      JSON.stringify({ success: false, error: "Erreur de communication avec le module de réservation & RDV." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
