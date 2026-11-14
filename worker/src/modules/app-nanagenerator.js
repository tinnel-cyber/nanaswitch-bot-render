/**
 * Module 4 : Nanagénérateur AI (Création de vidéos et visuels publicitaires) - app-nanagenerator
 * Vérification des quotas à l'Edge et proxying vers le backend AI.
 */

export async function handleNanageneratorModule(request, env, ctx) {
  const url = new URL(request.url);
  const renderBackend = (env.RENDER_BACKEND_URL && env.RENDER_BACKEND_URL !== "nanasore.onrender.com" ? env.RENDER_BACKEND_URL : "nanasore.com");

  // 1. Contrôle des quotas / crédits IA si c'est une requête de génération (POST)
  if (request.method === "POST") {
    try {
      // Optionnel : Lecture rapide d'un jeton ou d'un en-tête d'identification du marchand
      const merchantId = request.headers.get("X-Nanasore-Tenant");
      if (merchantId && env.PRODUCT_STOCK_KV) {
        const credits = await env.PRODUCT_STOCK_KV.get(`credits:ai:${merchantId}`);
        if (credits !== null && parseInt(credits, 10) <= 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "AI_QUOTA_EXCEEDED", 
              message: "Crédits de génération IA épuisés. Veuillez recharger votre portefeuille." 
            }),
            { status: 402, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    } catch (e) {
      // En cas d'erreur de lecture KV, on laisse passer au backend pour vérification définitive
    }
  }

  // 2. Préparation du proxy vers Render / Alibaba Cloud FC (via Backend)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "app-nanagenerator");

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
    responseHeaders.set("X-Served-By", "Nanasore-Nanagenerator-Edge");

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le studio Nanagénérateur AI." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
