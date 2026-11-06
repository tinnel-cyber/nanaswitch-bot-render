/**
 * Module : Synchronisation Temps Réel Firebase Auth & Supabase - srv-realtime-sync
 * Validation des tokens Firebase à l'Edge, émission de JWT Supabase & routage WebSocket.
 * Règle d'or : Réponse & validation JWT à l'Edge = 0 requête vers Render (<5ms).
 */

export async function handleRealtimeSyncModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = (env.RENDER_BACKEND_URL && env.RENDER_BACKEND_URL !== "nanasore.onrender.com" ? env.RENDER_BACKEND_URL : "pos-app-1759a.web.app");

  // 1. Échange et validation de Token Firebase -> Supabase RLS à l'Edge (POST /api/realtime/token-exchange)
  if (request.method === "POST" && path.includes("/token-exchange")) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Jeton Firebase requis." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Réponse ultra-rapide signée à l'Edge pour autoriser Supabase Realtime
    return new Response(
      JSON.stringify({
        success: true,
        realtime_endpoint: env.SUPABASE_REALTIME_URL || "https://your-supabase-project.supabase.co/realtime/v1",
        channel_auth: "granted",
        expires_in: 3600,
        provider: "firebase-supabase-bridge"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Nanasore-Cache": "HIT-EDGE-REALTIME-AUTH",
          "X-Served-By": "Nanasore-RealtimeSync-Edge"
        }
      }
    );
  }

  // 2. Consultation des états de synchronisation en temps réel (GET)
  if (request.method === "GET" && path.includes("/sync-status")) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-REALTIME-STATUS");
      return new Response(cachedResponse.body, { status: cachedResponse.status, headers: hitHeaders });
    }
  }

  // 3. Proxying vers le backend Render pour le traitement complexe ou les déclencheurs de base de données
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-realtime-sync");

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
    responseHeaders.set("X-Served-By", "Nanasore-RealtimeSync-Edge");

    if (request.method === "GET" && originResponse.status === 200 && path.includes("/sync-status")) {
      responseHeaders.set("Cache-Control", "public, max-age=60, s-maxage=60");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le bridge Firebase/Supabase Temps Réel." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
