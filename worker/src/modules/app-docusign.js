/**
 * Module 12 : DocuSign Hub & Contrats Signés - app-docusign
 * Vérification des liens signés et sécurité documentaire à l'Edge.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleDocuSignModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = (env.RENDER_BACKEND_URL && env.RENDER_BACKEND_URL !== "nanasore.onrender.com" ? env.RENDER_BACKEND_URL : "nanasore.pages.dev");

  // 1. Contrôle du jeton de signature ou vérification d'accès rapide
  if (path.startsWith("/docusign/") || path.startsWith("/api/doc-verify/")) {
    const docToken = url.searchParams.get("token") || url.searchParams.get("key");
    if (!docToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "MISSING_DOCUSIGN_TOKEN",
          message: "Jeton de document docusign manquant."
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 2. Vérification du Cache Edge pour les accès en lecture (GET)
  if (request.method === "GET") {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-DOCUSIGN");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 3. Forward vers Render si non trouvé en cache Edge
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "app-docusign");
  newHeaders.set("X-Nanasore-Doc-Timestamp", new Date().toISOString());

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
    responseHeaders.set("X-Served-By", "Nanasore-DocuSign-Edge");

    // Cache Edge de 10 minutes pour la consultation des documents publics validés
    if (request.method === "GET" && originResponse.status === 200 && path.startsWith("/docusign/view/")) {
      responseHeaders.set("Cache-Control", "public, max-age=600, s-maxage=600");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le Hub DocuSign." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
