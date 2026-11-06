/**
 * Module 38 : Routeur Global & Failover d'Urgence - srv-router
 * Filet de sécurité Edge-First, gestion de maintenance globale, purge de cache et SPA immédiat.
 * Règle d'or : Protection ultime et continuité de service assurée à l'Edge (Zéro 404).
 */

import { INDEX_HTML } from "./indexHtmlTemplate.js";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
  "CDN-Cache-Control": "no-store",
  "Cloudflare-CDN-Cache-Control": "no-store",
};

export async function handleGlobalRouterFallback(request, env, ctx) {
  const url = new URL(request.url);
  const PRIMARY_FRONTEND = "nanaswitch-bot-render-0kqp.onrender.com";
  const customBackend = env.RENDER_BACKEND_URL;
  const renderBackend = (customBackend && customBackend !== "nanasore.onrender.com")
    ? customBackend
    : PRIMARY_FRONTEND;

  // 1. Vérification d'un mode maintenance d'urgence dans Cloudflare KV (< 5 ms)
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
              ...NO_CACHE_HEADERS,
              "Content-Type": "application/json",
              "X-Nanasore-Cache": "HIT-KV-EMERGENCY-MAINTENANCE",
              "X-Served-By": "Nanasore-GlobalRouter-Failover"
            }
          }
        );
      }
    } catch (e) {}
  }

  // 2. Détection du type de ressource : Asset statique (.js, .css, .png, etc.) ou Page HTML (SPA)
  const isStaticAsset = url.pathname.includes(".") && !url.pathname.endsWith(".html");

  // Helper de proxying transparent
  async function proxyToHost(hostname) {
    const newHeaders = new Headers(request.headers);
    newHeaders.set("X-Nanasore-Module", "srv-router-fallback");
    newHeaders.set("X-Forwarded-Host", url.hostname);

    const targetUrl = new URL(request.url);
    targetUrl.hostname = hostname;
    targetUrl.protocol = "https:";

    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      redirect: "manual",
    });

    return await fetch(proxyRequest);
  }

  // Helper de rendu de la SPA Nanasore (Zéro 404 garanti)
  function renderSpaHtml() {
    return new Response(INDEX_HTML, {
      status: 200,
      headers: {
        ...NO_CACHE_HEADERS,
        "Content-Type": "text/html; charset=utf-8",
        "X-Served-By": "Nanasore-Edge-SPA-Direct",
      },
    });
  }

  // Si c'est un asset statique, tenter de le récupérer sur le backend ou sur le frontend primaire
  if (isStaticAsset) {
    try {
      let assetRes = await proxyToHost(renderBackend);
      if (assetRes.status === 404 && renderBackend !== PRIMARY_FRONTEND) {
        assetRes = await proxyToHost(PRIMARY_FRONTEND);
      }
      return assetRes;
    } catch (err) {
      if (renderBackend !== PRIMARY_FRONTEND) {
        try {
          return await proxyToHost(PRIMARY_FRONTEND);
        } catch (_) {}
      }
      return new Response("Asset introuvable", { status: 404 });
    }
  }

  // Si c'est une page HTML / navigation SPA (/, /courses, /admin, etc.)
  try {
    let originResponse = await proxyToHost(renderBackend);

    const isRenderNoServer = originResponse.status === 404 && originResponse.headers.get("x-render-routing") === "no-server";
    const isBackendDown = originResponse.status >= 500;

    // Si le serveur Render est down ou inexistant, tenter le frontend primaire
    if ((isRenderNoServer || isBackendDown) && renderBackend !== PRIMARY_FRONTEND) {
      console.warn(`[ROUTER_FAILOVER] Backend ${renderBackend} indisponible, bascule sur ${PRIMARY_FRONTEND}`);
      originResponse = await proxyToHost(PRIMARY_FRONTEND);
    }

    // Si même après tentative, la réponse est en erreur (404/5xx), servir directement l'application SPA intégrée
    if (originResponse.status === 404 || originResponse.status >= 500) {
      console.warn(`[ROUTER_SPA_RESCUE] Rendu direct de la SPA Nanasore pour ${url.pathname}`);
      return renderSpaHtml();
    }

    const responseHeaders = new Headers(originResponse.headers);
    responseHeaders.set("X-Served-By", "Nanasore-GlobalRouter-Edge");
    Object.entries(NO_CACHE_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[ROUTER_CRITICAL] Exception réseau vers le backend, activation du filet SPA:", err);
    return renderSpaHtml();
  }
}
