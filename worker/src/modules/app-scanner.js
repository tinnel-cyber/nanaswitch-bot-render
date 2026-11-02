/**
 * Module 10 : Scanner Physique Code-Barres & QR (Douchettes / Scanners USB & Bluetooth POS) - app-scanner
 * Traitement instantané des scans douchettes en caisse via KV (< 5 ms).
 * Règle d'or : Si présent dans Cloudflare KV -> HIT EDGE IMMÉDIAT (0 requête Render).
 */

export async function handleScannerModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Interception de l'événement de scan physique (GET /api/pos/scan?code=123456789 ou /api/scanner/lookup?barcode=123456789)
  if (request.method === "GET") {
    const barcode = url.searchParams.get("code") || url.searchParams.get("barcode") || url.searchParams.get("ean");

    if (barcode && env.PRODUCT_STOCK_KV) {
      try {
        // Recherche instantanée de la fiche produit en KV à l'Edge
        const cachedProduct = await env.PRODUCT_STOCK_KV.get(`scanner:barcode:${barcode}`);
        if (cachedProduct !== null) {
          // HIT EDGE KV IMMÉDIAT -> Renvoi direct à la caisse tactile, 0 requête transmise à Render
          return new Response(cachedProduct, {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-Nanasore-Cache": "HIT-EDGE-KV-PHYSICAL-SCANNER",
              "X-Served-By": "Nanasore-Scanner-Edge"
            }
          });
        }
      } catch (e) {
        // En cas d'erreur KV, fallback transparent vers le backend
      }
    }
  }

  // 2. Si le produit n'est pas encore en mémoire KV, transmission à Render pour lecture PostgreSQL
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "app-scanner");
  newHeaders.set("X-Nanasore-Device", "Physical-Barcode-Scanner");

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
    responseHeaders.set("X-Served-By", "Nanasore-Scanner-Edge");

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de connexion au module du Scanner Physique." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
