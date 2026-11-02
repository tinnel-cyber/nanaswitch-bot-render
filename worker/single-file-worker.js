/**
 * Cloudflare Worker Autonome - Nanasore Edge Router & Stock Circuit Breaker
 * Fichier 100% Autonome (Zero dépendance externe, prêt pour copier-coller Cloudflare Dashboard)
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-Nanasore-Source, X-Nanasore-Tenant, X-Nanasore-Device, X-Nanasore-CRM-Key",
};

export default {
  /**
   * Point d'entrée principal Cloudflare Worker
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Hôtes de destination
    const FRONTEND_HOST = env.FRONTEND_HOST || "pos-app-1759a.web.app";
    const PAYMENT_HOST = env.PAYMENT_HOST || "nana-payment-api.onrender.com";
    const RENDER_HOST = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

    // 1. Réponse immédiate aux requêtes de pré-vol CORS (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // 2. Healthcheck système ultra-rapide à l'Edge (< 5ms)
    if (
      path === "/health" ||
      path === "/healthz" ||
      path === "/api/health" ||
      path === "/ping" ||
      path === "/api/ping"
    ) {
      return jsonResponse({
        status: "healthy",
        service: env.APP_NAME || "Nanasore Edge Router & Stock Circuit Breaker",
        environment: env.ENVIRONMENT || "production",
        frontend: FRONTEND_HOST,
        paymentBackend: PAYMENT_HOST,
        edgeNode: request.cf?.colo || "EDGE",
        timestamp: new Date().toISOString()
      });
    }

    // 3. Circuit Breaker de Stock à l'Edge (Cloudflare KV)
    if (path.startsWith("/api/edge/stock") || path.startsWith("/stock/edge")) {
      return await handlePosStockEdge(request, env);
    }

    // 4. Mode maintenance d'urgence stocké dans le KV
    if (env.PRODUCT_STOCK_KV) {
      try {
        const maintenance = await env.PRODUCT_STOCK_KV.get("system:emergency_maintenance", { type: "json" });
        if (maintenance && maintenance.active) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "MAINTENANCE_MODE_ACTIVE",
              message: maintenance.message || "La plateforme Nanasore est en maintenance planifiée.",
              eta: maintenance.eta || "Retour sous peu"
            }),
            {
              status: 503,
              headers: {
                "Content-Type": "application/json",
                "X-Served-By": "Nanasore-Edge-Maintenance"
              }
            }
          );
        }
      } catch {
        // Poursuite normale en cas d'erreur KV
      }
    }

    // 5. Aiguillage intelligent des requêtes
    // Si la requête concerne les paiements / webhooks bancaires -> vers le micro-service Render Fixie
    // Pour toutes les pages web, l'application et les assets statiques -> vers l'application Web (Firebase Hosting)
    let targetHost = FRONTEND_HOST;
    if (
      path.startsWith("/api/payment") ||
      path.startsWith("/api/mobile-money") ||
      path.startsWith("/webhooks/payment")
    ) {
      targetHost = PAYMENT_HOST;
    }

    const targetUrl = new URL(request.url);
    targetUrl.hostname = targetHost;
    targetUrl.protocol = "https:";
    targetUrl.port = "";

    // Si la requête provient de la prévisualisation Cloudflare, normaliser vers le domaine officiel nanasore.com
    const effectiveHost = (url.hostname.includes("cloudflarepreviews.com") || url.hostname.includes("workers.dev"))
      ? "nanasore.com"
      : url.hostname;

    const newHeaders = new Headers(request.headers);
    newHeaders.set("Host", targetHost);
    newHeaders.set("X-Forwarded-Host", effectiveHost);
    newHeaders.set("X-Forwarded-Proto", "https");
    newHeaders.set("X-Served-By", "Nanasore-Edge-Router");

    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      redirect: "manual",
    });

    try {
      let originResponse = await fetch(proxyRequest);

      // Si le backend Render renvoie 404 sur une page de l'application, basculer vers le frontend Web
      if (originResponse.status === 404 && targetHost !== FRONTEND_HOST && !path.startsWith("/api/")) {
        const fallbackUrl = new URL(request.url);
        fallbackUrl.hostname = FRONTEND_HOST;
        fallbackUrl.protocol = "https:";
        fallbackUrl.port = "";

        const fallbackHeaders = new Headers(request.headers);
        fallbackHeaders.set("Host", FRONTEND_HOST);

        originResponse = await fetch(new Request(fallbackUrl.toString(), {
          method: request.method,
          headers: fallbackHeaders,
          body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
          redirect: "manual",
        }));
      }

      const responseHeaders = new Headers(originResponse.headers);
      responseHeaders.set("X-Served-By", "Nanasore-Edge-Router");
      responseHeaders.set("Access-Control-Allow-Origin", "*");

      return new Response(originResponse.body, {
        status: originResponse.status,
        statusText: originResponse.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      console.error("[EDGE PROXY ERROR]", err);
      return jsonResponse({
        success: false,
        error: "Erreur de connexion au serveur d'origine",
        details: err.message,
        targetHost
      }, 502);
    }
  }
};

/**
 * Circuit Breaker de Stock à l'Edge
 */
async function handlePosStockEdge(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (!env.PRODUCT_STOCK_KV) {
    return jsonResponse({
      success: false,
      circuitBreaker: "DISABLED",
      message: "Liaison PRODUCT_STOCK_KV non configurée sur le Worker"
    }, 200);
  }

  // GET /api/edge/stock/:id
  if (method === "GET") {
    const parts = path.split("/").filter(Boolean);
    const productId = parts[parts.length - 1];
    if (!productId || productId === "stock") {
      return jsonResponse({ success: false, error: "Identifiant produit requis" }, 400);
    }

    const raw = await env.PRODUCT_STOCK_KV.get(`stock:${productId}`);
    if (!raw) {
      return jsonResponse({
        success: true,
        productId,
        circuitBreaker: "CLOSED",
        message: "Produit non mis en cache KV, relais Supabase recommandé"
      }, 200);
    }

    const data = JSON.parse(raw);
    return jsonResponse({
      success: true,
      productId,
      stock: data.stock,
      name: data.name || null,
      isAvailable: Number(data.stock) > 0,
      circuitBreaker: Number(data.stock) <= 0 ? "OPEN" : "CLOSED"
    });
  }

  // POST /api/edge/stock/verify
  if (method === "POST" && path.endsWith("/verify")) {
    try {
      const body = await request.json();
      const { productId, quantity = 1 } = body || {};
      if (!productId) {
        return jsonResponse({ success: false, error: "productId requis" }, 400);
      }

      const raw = await env.PRODUCT_STOCK_KV.get(`stock:${productId}`);
      if (!raw) {
        return jsonResponse({ success: true, allowed: true, circuitBreaker: "PASSTHROUGH" });
      }

      const data = JSON.parse(raw);
      const currentStock = Number(data.stock) || 0;
      if (currentStock < Number(quantity)) {
        return jsonResponse({
          success: false,
          allowed: false,
          circuitBreaker: "OPEN",
          error: "STOCK_EXHAUSTED",
          message: `Stock insuffisant (${currentStock} disponible(s)). Vente bloquée à l'Edge.`
        }, 409);
      }

      return jsonResponse({
        success: true,
        allowed: true,
        circuitBreaker: "CLOSED",
        remainingEstimate: currentStock - Number(quantity)
      });
    } catch {
      return jsonResponse({ success: false, error: "Format JSON invalide" }, 400);
    }
  }

  // POST /api/edge/stock/sync
  if (method === "POST" && (path.endsWith("/sync") || path.endsWith("/update"))) {
    try {
      const body = await request.json();
      const { productId, stock, name } = body || {};
      if (!productId || stock === undefined) {
        return jsonResponse({ success: false, error: "productId et stock requis" }, 400);
      }

      await env.PRODUCT_STOCK_KV.put(
        `stock:${productId}`,
        JSON.stringify({
          productId,
          stock: Number(stock),
          name: name || null,
          updatedAt: new Date().toISOString()
        }),
        { expirationTtl: 86400 }
      );

      return jsonResponse({
        success: true,
        message: "Stock synchronisé à l'Edge KV avec succès"
      });
    } catch {
      return jsonResponse({ success: false, error: "Format JSON invalide" }, 400);
    }
  }

  return jsonResponse({ success: false, error: "Action stock non reconnue" }, 404);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}
