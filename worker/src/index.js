/**
 * ==============================================================================
 * Cloudflare Worker — Reverse Proxy Transparent Nanasore <-> Render
 * ==============================================================================
 * Cible Render : https://nanaswitch-bot-render-0kqp.onrender.com
 * Rôle : Relaye l'intégralité du trafic (méthodes, query, headers, streaming body)
 *        vers le serveur Render actif en forçant le Host header approprié.
 * ==============================================================================
 */

const RENDER_BACKEND_ORIGIN = "https://nanaswitch-bot-render-0kqp.onrender.com";

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
        target: RENDER_BACKEND_ORIGIN,
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

    // 1. Détermination stricte du backend Render (Ignore les vieilles variables d'environnement obsolètes)
    let backendOrigin = RENDER_BACKEND_ORIGIN;
    if (env && env.RENDER_BACKEND_URL && !env.RENDER_BACKEND_URL.includes("nanasore.onrender.com")) {
      backendOrigin = env.RENDER_BACKEND_URL.startsWith("http")
        ? env.RENDER_BACKEND_URL
        : `https://${env.RENDER_BACKEND_URL}`;
    }

    // 2. Construction de l'URL cible conservant exactement pathname et query params
    const targetUrl = new URL(url.pathname + url.search, backendOrigin);

    // 3. Duplication et transmission des en-têtes
    const proxyHeaders = new Headers();
    for (const [key, value] of request.headers.entries()) {
      const lower = key.toLowerCase();
      // On retire le Host header d'origine (nanasore.com) pour que Render reconnaisse son propre domaine
      if (!HOP_BY_HOP_HEADERS.has(lower) && lower !== "host") {
        proxyHeaders.set(key, value);
      }
    }

    // Le Host envoyé à Render DOIT être nanaswitch-bot-render-0kqp.onrender.com
    proxyHeaders.set("Host", targetUrl.host);
    proxyHeaders.set("X-Forwarded-Host", url.hostname);
    proxyHeaders.set("X-Forwarded-Proto", url.protocol.replace(":", ""));
    const clientIp = request.headers.get("cf-connecting-ip");
    if (clientIp) {
      proxyHeaders.set("X-Real-IP", clientIp);
      proxyHeaders.set("X-Forwarded-For", clientIp);
    }

    // 4. Préservation de la méthode HTTP et du corps de la requête (Body)
    const method = request.method.toUpperCase();
    const hasRequestBody = !["GET", "HEAD"].includes(method);
    const body = hasRequestBody ? request.body : undefined;

    const proxyRequestInit = {
      method,
      headers: proxyHeaders,
      body,
      redirect: "manual",
    };

    if (hasRequestBody && body) {
      proxyRequestInit.duplex = "half";
    }

    try {
      // 5. Acheminement transparent vers Render
      const backendResponse = await fetch(targetUrl.toString(), proxyRequestInit);

      // Duplication des en-têtes retournés par Render
      const responseHeaders = new Headers();
      for (const [key, value] of backendResponse.headers.entries()) {
        if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      }

      // Marqueur de diagnostic Edge
      responseHeaders.set("X-Served-By", "nanasore-cloudflare-worker-proxy");

      return new Response(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
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
            message: "Le serveur Nanasore (Render) est temporairement injoignable ou en cours de réveil.",
            details: error?.message || "Cold start Render en cours",
            target: targetUrl.hostname,
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "8",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "X-Served-By": "Nanasore-Edge-Error-Guard",
            },
          }
        );
      }

      // Écran de réveil élégant pour navigateurs Web
      const coldStartHtml = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="refresh" content="6" />
    <title>Nanasore — Démarrage du service</title>
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
        background: rgba(13, 21, 39, 0.75);
        border: 1px solid rgba(59, 130, 246, 0.35);
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
        animation: pulse 1.5s infinite ease-in-out;
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
      <p>Connexion sécurisée en cours. Le serveur sur Render se réveille, actualisation automatique dans quelques secondes...</p>
      <div class="loader"><div class="loader-bar"></div></div>
      <div class="footer">Statut 503 — Réveil automatique actif</div>
    </div>
  </body>
</html>`;

      return new Response(coldStartHtml, {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Retry-After": "6",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Served-By": "Nanasore-Edge-ColdStart-Guard",
        },
      });
    }
  },
};
