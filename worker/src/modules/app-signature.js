/**
 * Module 7 : Signature Numérique & Contrats (Signatures sécurisées et devis) - app-signature
 * Sécurisation des accès aux documents, validation de jetons et proxying backend.
 */

export async function handleSignatureModule(request, env, ctx) {
  const url = new URL(request.url);
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Contrôle préalable du jeton de signature pour les requêtes d'accès direct
  if (url.pathname.startsWith("/sign/")) {
    const signatureToken = url.searchParams.get("token");
    if (!signatureToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "INVALID_SIGNATURE_TOKEN", 
          message: "Jeton de signature manquant ou expiré." 
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "app-signature");
  // Horodatage Edge pour le traçage légal de la signature
  newHeaders.set("X-Nanasore-Edge-Timestamp", new Date().toISOString());

  // 2. Proxying vers le backend Render
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
    responseHeaders.set("X-Served-By", "Nanasore-Signature-Edge");

    // Aucune mise en cache pour garantir la confidentialité et l'intégrité des signatures
    responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur lors de la sécurisation du document de signature." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
