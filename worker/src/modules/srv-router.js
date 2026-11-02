/**
 * Module 38 : Routeur Global & Failover d'Urgence - srv-router
 * Filet de sécurité Edge-First, gestion de maintenance globale et mode dégradé (KV).
 * Règle d'or : Protection ultime et continuité de service assurée à l'Edge.
 */

export async function handleGlobalRouterFallback(request, env, ctx) {
  const url = new URL(request.url);
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Vérification d'un mode maintenance global ou d'urgence stocké dans Cloudflare KV (< 5 ms)
  if (env.PRODUCT_STOCK_KV) {
    try {
      const maintenanceMode = await env.PRODUCT_STOCK_KV.get("system:emergency_maintenance", { type: "json" });
      if (maintenanceMode && maintenanceMode.active) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "MAINTENANCE_MODE_ACTIVE",
            message: maintenanceMode.message || "La plateforme Nanasore fait l'objet d'une mise à jour de maintenance planifiée.",
            estimated_recovery: maintenanceMode.eta || "Bientôt de retour"
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "X-Nanasore-Cache": "HIT-KV-EMERGENCY-MAINTENANCE",
              "X-Served-By": "Nanasore-GlobalRouter-Failover"
            }
          }
        );
      }
    } catch (e) {
      // Ignorer l'erreur KV et poursuivre vers le routage normal
    }
  }

  // 2. Proxying universel de secours vers le backend Render pour toute route non interceptée par les 37 modules précédents
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-router-fallback");

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
    responseHeaders.set("X-Served-By", "Nanasore-GlobalRouter-Edge");

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    // 3. Fallback ultime en cas de panne critique du backend Render
    return new Response(
      JSON.stringify({
        success: false,
        error: "CRITICAL_BACKEND_OUTAGE",
        message: "Le serveur principal Nanasore est temporairement injoignable. Le trafic est sécurisé à l'Edge."
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "X-Served-By": "Nanasore-UltimateFallback-Edge"
        }
      }
    );
  }
}
