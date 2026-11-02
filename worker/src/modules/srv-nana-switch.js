/**
 * Module 21 : NaNa Switch Cloud (Multi-Comptes) - srv-nana-switch
 * Permutation et gestion du contexte multi-boutiques/POS à l'Edge.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handleNanaSwitchModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Interception de la bascule de boutique (ex: /switch-store?target=boutique_b)
  const targetStore = url.searchParams.get("target") || url.searchParams.get("store_id");

  // 2. Vérification du Cache Edge pour les listes de boutiques associées au compte (GET)
  if (request.method === "GET" && (path.includes("/stores/list") || path.includes("/context"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-NANA-SWITCH");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 3. Proxying vers Render avec injection du header de switch si demandé
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-nana-switch");
  if (targetStore) {
    newHeaders.set("X-Nanasore-Switch-Target", targetStore);
  }

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
    responseHeaders.set("X-Served-By", "Nanasore-NanaSwitch-Edge");

    // Si une bascule de boutique est effectuée avec succès en POST, on peut poser un cookie de contexte
    if (targetStore && originResponse.status === 200) {
      responseHeaders.append(
        "Set-Cookie",
        `nanasore_active_store=${targetStore}; Path=/; Max-Age=86400; Secure; SameSite=Lax`
      );
    }

    // Cache Edge de 5 minutes pour les listes de contextes multi-boutiques
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/stores/list") || path.includes("/context"))) {
      responseHeaders.set("Cache-Control", "public, max-age=300, s-maxage=300");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le module NaNa Switch Multi-Comptes." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
