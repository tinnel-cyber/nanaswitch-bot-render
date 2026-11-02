/**
 * Module 30 : Gestion de la Paie & Présences Employés - mod-payroll
 * Cache Edge ultra-rapide des structures de paie et barèmes de présence.
 * Règle d'or : Cache Edge HIT = 0 requête vers Render.
 */

export async function handlePayrollModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const renderBackend = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

  // 1. Vérification du Cache Edge pour les barèmes de paie, grilles de salaire et configurations de présence (GET)
  if (request.method === "GET" && (path.includes("/salary-scales") || path.includes("/attendance-rules") || path.includes("/summary"))) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-PAYROLL");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: hitHeaders
      });
    }
  }

  // 2. Proxying vers le backend Render (pour pointage des heures, génération de fiches de paie, virements)
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "mod-payroll");

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
    responseHeaders.set("X-Served-By", "Nanasore-PayrollService-Edge");

    // Cache Edge de 15 minutes pour les barèmes et règles de présence
    if (request.method === "GET" && originResponse.status === 200 && (path.includes("/salary-scales") || path.includes("/attendance-rules") || path.includes("/summary"))) {
      responseHeaders.set("Cache-Control", "public, max-age=900, s-maxage=900");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le module de Paie & Présences." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
