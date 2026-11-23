/**
 * ==============================================================================
 * Cloudflare Worker — Reverse Proxy Transparent Nanasore <-> Render & Northflank
 * ==============================================================================
 * Architecture Dual-Cloud Haute Disponibilité avec Failover automatique.
 * Backend Principal : Render (https://nanaswitch-bot-render-0kqp.onrender.com)
 * Backend Secondaire : Northflank (https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run)
 * ==============================================================================
 */

const PRIMARY_ORIGIN = "https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run";
const SECONDARY_ORIGIN = "https://nanaswitch-bot-render-0kqp.onrender.com";

// En-têtes "hop-by-hop" standard HTTP à ne pas relayer directement
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

export default {
  /**
   * Point d'entrée principal du Cloudflare Worker (ES Modules)
   * @param {Request} request Requête HTTP entrante
   * @param {Record<string, any>} env Variables d'environnement / Bindings Cloudflare
   * @param {ExecutionContext} ctx Contexte d'exécution
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 0. Route spéciale de purge de cache à l'Edge
    if (url.pathname === "/api/purge-cache" || url.searchParams.get("purge") === "1") {
      if (typeof caches !== "undefined" && caches.default) {
        try {
          await caches.default.delete(request);
        } catch (_) {}
      }
      return new Response(JSON.stringify({
        success: true,
        message: "Cache Cloudflare Worker purgé avec succès",
        primary: PRIMARY_ORIGIN,
        timestamp: new Date().toISOString()
      }, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Clear-Site-Data": '"cache", "cookies", "storage"'
        }
      });
    }

    // 1. Détermination du pool de backends (Northflank primaire Always-On + Render secours)
    let primaryOrigin = PRIMARY_ORIGIN;
    let fallbackOrigin = SECONDARY_ORIGIN;

    const configuredPrimary = env && (env.PRIMARY_BACKEND_URL || env.NORTHFLANK_BACKEND_URL);
    if (configuredPrimary) {
      primaryOrigin = configuredPrimary.startsWith("http")
        ? configuredPrimary
        : `https://${configuredPrimary}`;
    }

    const configuredSecondary = env && (env.SECONDARY_BACKEND_URL || env.RENDER_BACKEND_URL);
    if (configuredSecondary && !configuredSecondary.includes("nanasore.onrender.com")) {
      fallbackOrigin = configuredSecondary.startsWith("http")
        ? configuredSecondary
        : `https://${configuredSecondary}`;
    }

    // 2. Préparation du corps de la requête pour réessai idempotent éventuel
    const method = request.method.toUpperCase();
    const hasRequestBody = !["GET", "HEAD"].includes(method);
    let requestBodyBuffer = null;
    if (hasRequestBody && request.body) {
      requestBodyBuffer = await request.arrayBuffer();
    }

    // 3. Helper d'acheminement vers un backend spécifique
    const tryProxy = async (originUrl) => {
      const targetUrl = new URL(url.pathname + url.search, originUrl);
      const proxyHeaders = new Headers();

      for (const [key, value] of request.headers.entries()) {
        const lower = key.toLowerCase();
        if (!HOP_BY_HOP_HEADERS.has(lower) && lower !== "host") {
          proxyHeaders.set(key, value);
        }
      }

      proxyHeaders.set("Host", targetUrl.host);
      proxyHeaders.set("X-Forwarded-Host", url.hostname);
      proxyHeaders.set("X-Forwarded-Proto", url.protocol.replace(":", ""));
      const clientIp = request.headers.get("cf-connecting-ip");
      if (clientIp) {
        proxyHeaders.set("X-Real-IP", clientIp);
        proxyHeaders.set("X-Forwarded-For", clientIp);
      }

      const proxyInit = {
        method,
        headers: proxyHeaders,
        body: requestBodyBuffer ? requestBodyBuffer.slice(0) : undefined,
        redirect: "manual",
      };

      if (hasRequestBody && requestBodyBuffer) {
        proxyInit.duplex = "half";
      }

      const backendResponse = await fetch(targetUrl.toString(), proxyInit);
      return { backendResponse, targetUrl };
    };

    try {
      // 4. Tentative sur le backend principal (Render)
      let activeTargetUrl = null;
      let activeResponse = null;

      try {
        const result = await tryProxy(primaryOrigin);
        activeResponse = result.backendResponse;
        activeTargetUrl = result.targetUrl;

        // Si le backend principal retourne 502/503 (ex: "no healthy upstream"), tenter le secondaire
        if (activeResponse.status >= 502 && fallbackOrigin && fallbackOrigin !== primaryOrigin) {
          console.warn(`[FAILOVER_TRIGGER] Statut ${activeResponse.status} sur ${primaryOrigin}, bascule vers ${fallbackOrigin}`);
          try {
            const fallbackResult = await tryProxy(fallbackOrigin);
            if (fallbackResult.backendResponse.status < 500) {
              activeResponse = fallbackResult.backendResponse;
              activeTargetUrl = fallbackResult.targetUrl;
            }
          } catch (eFallback) {
            console.warn("[FAILOVER_FAILED]", eFallback);
          }
        }
      } catch (errPrimary) {
        console.warn(`[PRIMARY_FAILED] ${errPrimary.message}, tentative sur le secours...`);
        if (fallbackOrigin && fallbackOrigin !== primaryOrigin) {
          const fallbackResult = await tryProxy(fallbackOrigin);
          activeResponse = fallbackResult.backendResponse;
          activeTargetUrl = fallbackResult.targetUrl;
        } else {
          throw errPrimary;
        }
      }

      // Si le backend renvoie toujours une erreur 503/502 (ex: cold start Render ou Northflank down)
      if (activeResponse.status >= 502) {
        const responseText = await activeResponse.clone().text();
        if (responseText.includes("no healthy upstream") || responseText.includes("upstream connect error") || activeResponse.status === 503) {
          throw new Error("Backend 503 Unavailable : " + responseText.slice(0, 100));
        }
      }

      // 5. Duplication et transmission saine des en-têtes
      const responseHeaders = new Headers();
      for (const [key, value] of activeResponse.headers.entries()) {
        if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      }

      // Marqueur de diagnostic Edge
      responseHeaders.set("X-Served-By", "nanasore-cloudflare-worker-proxy");

      return new Response(activeResponse.body, {
        status: activeResponse.status,
        statusText: activeResponse.statusText,
        headers: responseHeaders,
      });

    } catch (error) {
      // 6. Gestion d'erreur & réveil automatique Render (Cold Start / 503)
      console.error("[RENDER_PROXY_ERROR]", error);

      const isApiRequest = url.pathname.startsWith("/api/") ||
        (request.headers.get("accept") || "").includes("application/json");

      if (isApiRequest) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "BACKEND_UNAVAILABLE",
            message: "Le serveur Nanasore est en cours de synchronisation. Veuillez réessayer dans quelques secondes.",
            details: error?.message || "Cold start en cours",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "4",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "X-Served-By": "Nanasore-Edge-Error-Guard",
            },
          }
        );
      }

      // Écran de réveil élégant pour navigateurs Web (Remplace 'no healthy upstream' par le loader officiel Nanasore)
      const coldStartHtml = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="refresh" content="4" />
    <title>Nanasore — Démarrage sécurisé</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        background: radial-gradient(circle at 50% 35%, #0A285E 0%, #051738 55%, #020B1E 100%);
        color: #f8fafc;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 20px;
      }
      .card {
        background: rgba(13, 21, 39, 0.85);
        border: 1px solid rgba(59, 130, 246, 0.4);
        border-radius: 24px;
        padding: 36px 28px;
        max-width: 440px;
        width: 100%;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(12px);
      }
      h1 { font-size: 26px; margin: 0 0 8px; font-weight: 900; }
      h1 .accent { color: #22d3ee; }
      p { font-size: 13px; color: #cbd5e1; line-height: 1.5; margin: 0 0 24px; }
      .loader {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 9999px;
        overflow: hidden;
        position: relative;
        margin-bottom: 16px;
      }
      .loader-bar {
        position: absolute;
        top: 0; left: 0; bottom: 0;
        width: 40%;
        background: linear-gradient(90deg, #2563eb, #22d3ee);
        border-radius: 9999px;
        animation: pulse 1.2s infinite ease-in-out;
      }
      @keyframes pulse {
        0% { left: -40%; width: 40%; }
        50% { left: 30%; width: 60%; }
        100% { left: 100%; width: 40%; }
      }
      .footer { font-size: 11px; color: #94a3b8; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Nana<span class="accent">sore</span></h1>
      <p>Connexion sécurisée en cours. Initialisation des services, actualisation automatique dans un instant...</p>
      <div class="loader"><div class="loader-bar"></div></div>
      <div class="footer">Synchronisation Edge active — Chargement immédiat</div>
    </div>
  </body>
</html>`;

      return new Response(coldStartHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Retry-After": "4",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Served-By": "Nanasore-Edge-ColdStart-Guard",
        },
      });
    }
  },
};
