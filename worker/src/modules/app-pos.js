/**
 * Module 1 : Caisse Tactile Magasin (POS) - app-pos
 * Gestion de l'Edge pour les encaissements, l'isolation des caissiers et l'appel backend.
 */

export async function handlePOSModule(request, env, RENDER_BACKEND_URL) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 1. Validation ou enrichissement des en-têtes POS spécifiques
  const newHeaders = new Headers(request.headers);
  
  // Injecter un marqueur pour signifier que la requête vient de la Caisse Tactile Edge
  newHeaders.set("X-Nanasore-Source", "Edge-POS-Terminal");

  // 2. Traitement spécifique des routes POS à l'Edge
  if (path === "/api/pos/session/verify" && request.method === "POST") {
    try {
      const body = await request.clone().json();
      const { cashierPin, storeId } = body;

      // Exemple de contrôle rapide du code PIN caissier via KV (optionnel ou délégué à Remix)
      if (!cashierPin || !storeId) {
        return new Response(
          JSON.stringify({ success: false, message: "PIN ou ID de magasin manquant." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (e) {
      // Si le corps n'est pas du JSON valide
      return new Response(
        JSON.stringify({ success: false, message: "Format de requête invalide." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 3. Transmission sécurisée de la requête POS vers le backend Remix (Render)
  const targetUrl = new URL(request.url);
  targetUrl.hostname = RENDER_BACKEND_URL;
  targetUrl.protocol = "https:";

  const proxyRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers: newHeaders,
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    redirect: "manual",
  });

  try {
    const backendResponse = await fetch(proxyRequest);
    const responseHeaders = new Headers(backendResponse.headers);
    responseHeaders.set("X-Module-Handled", "app-pos");

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le serveur de caisse Remix." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
