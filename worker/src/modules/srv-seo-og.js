/**
 * Module 39 : SEO & Open Graph Dynamique - srv-seo-og (Version pur Edge-First)
 * Génération Open Graph à l'Edge (<5ms) pour WhatsApp, Facebook, Googlebot.
 * Règle d'or : Cache Edge / KV HIT = 0 requête vers Render pour bots & sitemaps.
 */

const SOCIAL_BOTS_USER_AGENTS = [
  "facebookexternalhit",
  "whatsapp",
  "twitterbot",
  "linkedinbot",
  "telegrambot",
  "pinterest",
  "slackbot",
  "googlebot",
  "bingbot"
];

export async function handleSeoOgModule(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
  const renderBackend = (env.RENDER_BACKEND_URL && env.RENDER_BACKEND_URL !== "nanasore.onrender.com" ? env.RENDER_BACKEND_URL : "nanasore.pages.dev");

  const isSocialBot = SOCIAL_BOTS_USER_AGENTS.some(bot => userAgent.includes(bot));

  // 1. Gestion des Sitemaps et Robots.txt à l'Edge (0 appel Render)
  if (path === "/sitemap.xml" || path === "/robots.txt") {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-SEO-SITEMAP");
      return new Response(cachedResponse.body, { status: cachedResponse.status, headers: hitHeaders });
    }
  }

  // 2. Génération / Interception Open Graph à l'Edge pour les Bots ou requêtes /api/og/
  if (isSocialBot || path.startsWith("/api/og/")) {
    const cache = caches.default;
    const cachedOg = await cache.match(request);
    if (cachedOg) {
      const hitHeaders = new Headers(cachedOg.headers);
      hitHeaders.set("X-Nanasore-Cache", "HIT-EDGE-OPENGRAPH");
      return new Response(cachedOg.body, { status: cachedOg.status, headers: hitHeaders });
    }

    if (env.PRODUCT_STOCK_KV) {
      try {
        const ogKey = `og:${url.hostname}:${path}`;
        const ogData = await env.PRODUCT_STOCK_KV.get(ogKey, { type: "json" });
        if (ogData) {
          const htmlOg = buildOpenGraphHtml(ogData, url.href);
          const response = new Response(htmlOg, {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=86400, s-maxage=86400",
              "X-Nanasore-Cache": "HIT-KV-OPENGRAPH",
              "X-Served-By": "Nanasore-SeoOgService-Edge"
            }
          });
          ctx.waitUntil(cache.put(request, response.clone()));
          return response;
        }
      } catch (e) {
        // Fallback vers le backend Render
      }
    }
  }

  // 3. Proxying vers le backend Render pour les requêtes dynamiques SEO / OG non mises en cache
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Nanasore-Module", "srv-seo-og");

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
    responseHeaders.set("X-Served-By", "Nanasore-SeoOgService-Edge");

    if (request.method === "GET" && originResponse.status === 200 && (path === "/sitemap.xml" || path.startsWith("/api/og/"))) {
      responseHeaders.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
      ctx.waitUntil(caches.default.put(request, originResponse.clone()));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur de communication avec le module SEO & Open Graph." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Générateur HTML de balises Open Graph dynamiques à l'Edge
 */
function buildOpenGraphHtml(data, currentUrl) {
  const title = data.title || "Nanasore - Multi-Tenant Commerce & Business Suite";
  const description = data.description || "Découvrez nos offres, cours, lives et services sur Nanasore.";
  const image = data.image || "https://nanasore.com/assets/og-default.jpg";
  const type = data.type || "website";
  const siteName = data.site_name || "Nanasore Ecosystem";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="${escapeHtml(type)}">
  <meta property="og:url" content="${escapeHtml(currentUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapeHtml(currentUrl)}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">

  <!-- Redirection pour les utilisateurs humains si accédé directement -->
  <script>window.location.href = "${escapeHtml(currentUrl)}";</script>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}">
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
