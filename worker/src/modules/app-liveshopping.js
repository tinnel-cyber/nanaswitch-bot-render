/**
 * Module 6 : Live Shopping & Webinaires (Ventes interactives en direct) - app-liveshopping
 * Gestion Edge du trafic temps réel, support des WebSockets et proxying streaming backend.
 */

export async function handleLiveShoppingModule(request, env, ctx) {
  const url = new URL(request.url);
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Support direct des connexions WebSocket pour le chat/reactions en temps réel
  const upgradeHeader = request.headers.get("Upgrade");
  const isWebSocket = upgradeHeader && upgradeHeader.toLowerCase() === "websocket";

  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "app-liveshopping");

  // 2. Proxying de la requête vers le backend Render
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

    // Si c'est une connexion WebSocket, renvoyer la réponse sans altérer le flux
    if (isWebSocket) {
      return originResponse;
    }

    const responseHeaders = new Headers(originResponse.headers);
    responseHeaders.set("X-Served-By", "Nanasore-LiveShopping-Edge");

    // Pas de cache Edge agressif pour les sessions live temps réel (uniquement du bypass direct)
    responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de connexion avec le serveur Live Shopping." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
