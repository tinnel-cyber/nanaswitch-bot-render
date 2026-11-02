/**
 * Module 37 : Monitoring de Santé & Health Checks Système - srv-health
 * Diagnostic de santé Edge-First, statuts de service et vérification instantanée.
 * Règle d'or : Réactivité maximale à l'Edge (<5ms) et protection du backend.
 */

export async function handleHealthModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Réponse instantanée de santé à l'Edge (ex: /health, /ping) sans surcharger Render
  if (path === "/health" || path === "/ping" || path === "/api/health") {
    return new Response(
      JSON.stringify({
        status: "healthy",
        edge_worker: "active",
        timestamp: new Date().toISOString(),
        service: "nanasore-edge-router"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Nanasore-Cache": "HIT-EDGE-HEALTH-CHECK",
          "X-Served-By": "Nanasore-HealthMonitor-Edge"
        }
      }
    );
  }

  // 2. Proxying vers le backend Render pour les rapports de santé détaillés ou diagnostics de clusters
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-health");

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
    responseHeaders.set("X-Served-By", "Nanasore-HealthService-Edge");

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "degraded", edge_fallback: true, error: "Backend Render injoignable mais Edge actif." }),
      { status: 503, headers: { "Content-Type": "application/json", "X-Served-By": "Nanasore-HealthFallback-Edge" } }
    );
  }
}
