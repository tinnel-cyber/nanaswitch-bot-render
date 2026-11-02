/**
 * Module Cloudflare Worker : Circuit Breaker de Stock à l'Edge (POS & Vitrine)
 * Emplacement : worker/src/modules/pos-stock.js
 * 
 * Rôle :
 * Intercepte les vérifications de stock et les tentatives de vente directement aux nœuds Cloudflare (Edge).
 * Si le stock d'un produit est épuisé (<= 0), le circuit breaker s'active ("open")
 * et rejette immédiatement la requête sans saturer la base de données PostgreSQL Supabase.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

/**
 * Routeur principal du sous-module POS Stock
 * @param {Request} request 
 * @param {object} env Liaisons KV et variables (env.PRODUCT_STOCK_KV)
 * @param {object} ctx Contexte Cloudflare ExecutionContext
 */
export async function handlePosStock(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // 1. GET /api/edge/stock/:id - Lecture ultra-rapide à l'Edge depuis le KV
  if (method === "GET") {
    const parts = path.split("/").filter(Boolean);
    const productId = parts[parts.length - 1];

    if (!productId || productId === "stock") {
      return jsonResponse({ success: false, error: "Identifiant produit requis" }, 400);
    }

    return await getProductStockEdge(productId, env);
  }

  // 2. POST /api/edge/stock/verify - Circuit Breaker de pré-validation avant vente
  if (method === "POST" && path.endsWith("/verify")) {
    const body = await parseJsonSafely(request);
    const { productId, quantity = 1 } = body || {};

    if (!productId) {
      return jsonResponse({ success: false, error: "productId requis" }, 400);
    }

    return await verifyStockCircuitBreaker(productId, quantity, env);
  }

  // 3. POST /api/edge/stock/sync - Mise à jour ou rafraîchissement du KV (appelé après vente Supabase)
  if (method === "POST" && (path.endsWith("/sync") || path.endsWith("/update"))) {
    const body = await parseJsonSafely(request);
    const { productId, stock, name } = body || {};

    if (!productId || stock === undefined) {
      return jsonResponse({ success: false, error: "productId et stock sont requis" }, 400);
    }

    return await syncProductStockEdge(productId, stock, name, env);
  }

  return jsonResponse({ success: false, error: "Action stock non reconnue" }, 404);
}

/**
 * Récupère l'état du stock depuis Cloudflare KV
 */
async function getProductStockEdge(productId, env) {
  if (!env.PRODUCT_STOCK_KV) {
    return jsonResponse({
      success: false,
      circuitBreaker: "DISABLED",
      message: "Liaison PRODUCT_STOCK_KV non configurée",
    }, 500);
  }

  const rawData = await env.PRODUCT_STOCK_KV.get(`stock:${productId}`);

  if (!rawData) {
    return jsonResponse({
      success: true,
      productId,
      status: "CACHE_MISS",
      circuitBreaker: "CLOSED",
      message: "Produit non encore synchronisé au KV Edge, vérification Supabase recommandée",
    }, 200);
  }

  const stockData = JSON.parse(rawData);
  const isAvailable = Number(stockData.stock) > 0;

  return jsonResponse({
    success: true,
    productId,
    stock: stockData.stock,
    name: stockData.name || null,
    isAvailable,
    circuitBreaker: isAvailable ? "CLOSED" : "TRIPPED_OPEN",
    cachedAt: stockData.updatedAt,
  });
}

/**
 * Circuit Breaker : bloque instantanément à l'Edge si le stock est insuffisant
 */
async function verifyStockCircuitBreaker(productId, requestedQty, env) {
  if (!env.PRODUCT_STOCK_KV) {
    return jsonResponse({ allowPassThrough: true, reason: "KV_UNAVAILABLE" });
  }

  const rawData = await env.PRODUCT_STOCK_KV.get(`stock:${productId}`);
  if (!rawData) {
    // Cache miss : autorise le passage vers Supabase
    return jsonResponse({
      allowPassThrough: true,
      circuitBreaker: "CLOSED",
      reason: "CACHE_MISS",
    });
  }

  const stockData = JSON.parse(rawData);
  const currentStock = Number(stockData.stock || 0);

  // RUPTURE DE STOCK DÉTECTÉE À L'EDGE -> Circuit Breaker Ouvert !
  if (currentStock < requestedQty) {
    return jsonResponse({
      allowPassThrough: false,
      circuitBreaker: "TRIPPED_OPEN",
      error: `Circuit Breaker Edge: Stock insuffisant (${currentStock} disponible(s), ${requestedQty} demandé(s)). La requête a été arrêtée à l'Edge.`,
      currentStock,
      requestedQty,
    }, 409);
  }

  // Stock suffisant : autorise la finalisation de transaction
  return jsonResponse({
    allowPassThrough: true,
    circuitBreaker: "CLOSED",
    currentStock,
    requestedQty,
  });
}

/**
 * Synchronise la valeur du stock dans Cloudflare KV
 */
async function syncProductStockEdge(productId, stock, name, env) {
  if (!env.PRODUCT_STOCK_KV) {
    return jsonResponse({ success: false, error: "PRODUCT_STOCK_KV introuvable" }, 500);
  }

  const payload = {
    stock: Number(stock),
    name: name || undefined,
    updatedAt: new Date().toISOString(),
  };

  // Stockage KV avec TTL optionnel (ex: 7 jours)
  await env.PRODUCT_STOCK_KV.put(`stock:${productId}`, JSON.stringify(payload), {
    expirationTtl: 60 * 60 * 24 * 7,
  });

  return jsonResponse({
    success: true,
    message: "Stock synchronisé à l'Edge Cloudflare KV",
    productId,
    stock: Number(stock),
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: CORS_HEADERS,
  });
}

async function parseJsonSafely(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
