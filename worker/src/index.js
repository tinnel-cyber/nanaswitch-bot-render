/**
 * Routeur Central Cloudflare Worker - Nanasore Edge
 * Catalogue marchand : 27 modules (11 applications + 7 services + 6 modules + 3 outils).
 * Hors catalogue : health, SEO, realtime, stock KV, router (infra uniquement).
 */

import { handlePosStock } from "./modules/pos-stock.js";
import { handlePOSModule } from "./modules/app-pos.js";
import { handleStudioModule } from "./modules/app-studio.js";
import { handleWameetModule } from "./modules/app-wameet.js";
import { handleWameetMediaModule } from "./modules/srv-wameet-media.js";
import { handleNanageneratorModule } from "./modules/app-nanagenerator.js";
import { handleLMSModule } from "./modules/app-lms.js";
import { handleFunnelsModule } from "./modules/app-funnels.js";
import { handleScannerModule } from "./modules/app-scanner.js";
import { handleWebinarModule } from "./modules/app-webinar.js";
import { handleDocuSignModule } from "./modules/app-docusign.js";
import { handleCrmAutomationModule } from "./modules/srv-crm-automation.js";
import { handleThemeBuilderModule } from "./modules/srv-theme-builder.js";
import { handlePartnerModule } from "./modules/srv-partner.js";
import { handleCourseCreateModule } from "./modules/srv-course-create.js";
import { handleNanaSwitchModule } from "./modules/srv-nana-switch.js";
import { handleInventoryModule } from "./modules/mod-inventory.js";
import { handleDebtsModule } from "./modules/mod-debts.js";
import { handleAnalyticsModule } from "./modules/srv-analytics.js";
import { handleSearchEngineModule } from "./modules/srv-search-engine.js";
import { handleWebhooksModule } from "./modules/srv-webhooks.js";
import { handleHealthModule } from "./modules/srv-health.js";
import { handleGlobalRouterFallback } from "./modules/srv-router.js";
import { handleSeoOgModule } from "./modules/srv-seo-og.js";
import { handleRealtimeSyncModule } from "./modules/srv-realtime-sync.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-Nanasore-Source, X-Nanasore-Tenant, X-Nanasore-Device, X-Nanasore-CRM-Key",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const hostname = url.hostname;
    const RENDER_BACKEND_URL = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    try {
      if (
        path.startsWith("/api/health") ||
        path.startsWith("/health") ||
        path.startsWith("/ping") ||
        path === "/ping"
      ) {
        return await handleHealthModule(request, env, ctx);
      }

      if (path === "/routes" || path === "/api/routes") {
        return jsonResponse({
          status: "healthy",
          service: env.APP_NAME || "Nanasore Edge Worker",
          environment: env.ENVIRONMENT || "production",
          catalogSize: 27,
          backendUrl: RENDER_BACKEND_URL,
          timestamp: new Date().toISOString(),
          kvBound: Boolean(env.PRODUCT_STOCK_KV),
          routes: [
            "INFRA  /health, /ping, /api/health*",
            "INFRA  /sitemap.xml, /robots.txt, /api/seo/*, /api/og/*",
            "INFRA  /api/realtime/*, /api/sync/firebase-supabase",
            "INFRA  /api/edge/stock/*",
            "1  /api/pos/* (app-pos)",
            "2  *.nsore.shop, /api/studio/*, /shop/* (app-studio)",
            "3  /wameet/*, /api/wameet/* (app-wameet)",
            "4  /api/nanagenerator/* (app-nanagenerator)",
            "5-7  /api/funnels/*, /funnel/* (funnels)",
            "8  /api/lms/*, /academy/*, /courses/* (cours-forge / academy)",
            "9  /api/search/* (app-nanamarket)",
            "10 /api/webinar/*, /webinar/* (app-webinar)",
            "11 /api/docusign/*, /docusign/* (app-docusign)",
            "12 /api/crm/* (srv-crm-automation)",
            "13 /api/themes/*, /api/theme-builder/* (srv-theme-builder)",
            "14 /api/partner/*, /ref/* (srv-partner)",
            "15 /api/course-create/* (srv-course-create)",
            "16 /api/nana-switch/*, /switch-store/* (srv-nana-switch)",
            "17 /api/inventory/*, /inventory/* (mod-inventory)",
            "18 /api/debts/*, /debts/* (mod-debts)",
            "19 /api/analytics/*, /api/stats/* (mod-analytics)",
            "20 /api/pos/scan*, /api/scanner/*, /api/barcode/* (tool-scanner)",
            "21 /api/webhooks/* (tool-gateway)",
            "FALLBACK  * → srv-router → Render",
          ],
        });
      }

      const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
      const isSocialBot = [
        "facebookexternalhit",
        "whatsapp",
        "twitterbot",
        "linkedinbot",
        "telegrambot",
        "pinterest",
        "slackbot",
        "googlebot",
        "bingbot",
      ].some((bot) => userAgent.includes(bot));

      if (
        path === "/sitemap.xml" ||
        path === "/robots.txt" ||
        path.startsWith("/api/seo/") ||
        path === "/api/seo" ||
        path.startsWith("/api/og/") ||
        path === "/api/og" ||
        (isSocialBot && !path.startsWith("/api/"))
      ) {
        return await handleSeoOgModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/pos/scan") ||
        path.startsWith("/api/scanner/") ||
        path === "/api/scanner" ||
        path.startsWith("/api/barcode/") ||
        path === "/api/barcode"
      ) {
        return await handleScannerModule(request, env, ctx);
      }

      if (path.startsWith("/api/pos/") || path === "/api/pos") {
        return await handlePOSModule(request, env, RENDER_BACKEND_URL);
      }

      if (
        path.startsWith("/api/wameet/") ||
        path === "/api/wameet" ||
        path.startsWith("/wameet/reels") ||
        path.startsWith("/wameet/live") ||
        path.startsWith("/wameet/stream")
      ) {
        return await handleWameetMediaModule(request, env, ctx);
      }

      if (path.startsWith("/wameet/") || path === "/wameet") {
        return await handleWameetModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/nanagenerator/") ||
        path === "/api/nanagenerator" ||
        path.startsWith("/api/ai/nanagenerator")
      ) {
        return await handleNanageneratorModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/webinar/") ||
        path === "/api/webinar" ||
        path.startsWith("/api/live-studio/") ||
        path === "/api/live-studio" ||
        path.startsWith("/webinar/") ||
        path === "/webinar"
      ) {
        return await handleWebinarModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/docusign/") ||
        path === "/api/docusign" ||
        path.startsWith("/api/doc-verify/") ||
        path === "/api/doc-verify" ||
        path.startsWith("/docusign/") ||
        path === "/docusign"
      ) {
        return await handleDocuSignModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/crm/") ||
        path === "/api/crm" ||
        path.startsWith("/webhooks/crm/") ||
        path === "/webhooks/crm"
      ) {
        return await handleCrmAutomationModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/themes/") ||
        path === "/api/themes" ||
        path.startsWith("/api/theme-builder/") ||
        path === "/api/theme-builder" ||
        path.startsWith("/assets/themes/")
      ) {
        return await handleThemeBuilderModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/partner/") ||
        path === "/api/partner" ||
        path.startsWith("/api/affiliate/") ||
        path === "/api/affiliate" ||
        path.startsWith("/ref/") ||
        path === "/ref"
      ) {
        return await handlePartnerModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/course-create/") ||
        path === "/api/course-create" ||
        path.startsWith("/api/lms-structure/") ||
        path === "/api/lms-structure"
      ) {
        return await handleCourseCreateModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/nana-switch/") ||
        path === "/api/nana-switch" ||
        path.startsWith("/api/multi-store/") ||
        path === "/api/multi-store" ||
        path.startsWith("/switch-store/") ||
        path === "/switch-store"
      ) {
        return await handleNanaSwitchModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/inventory/") ||
        path === "/api/inventory" ||
        path.startsWith("/api/stock-alert/") ||
        path === "/api/stock-alert" ||
        path.startsWith("/inventory/") ||
        path === "/inventory"
      ) {
        return await handleInventoryModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/debts/") ||
        path === "/api/debts" ||
        path.startsWith("/api/customer-credits/") ||
        path === "/api/customer-credits" ||
        path.startsWith("/debts/") ||
        path === "/debts"
      ) {
        return await handleDebtsModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/analytics/") ||
        path === "/api/analytics" ||
        path.startsWith("/api/stats/") ||
        path === "/api/stats" ||
        path.startsWith("/analytics/") ||
        path === "/analytics"
      ) {
        return await handleAnalyticsModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/search/") ||
        path === "/api/search" ||
        path.startsWith("/api/index-query/") ||
        path === "/api/index-query" ||
        path.startsWith("/search/") ||
        path === "/search"
      ) {
        return await handleSearchEngineModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/webhooks/") ||
        path === "/api/webhooks" ||
        path.startsWith("/api/event-subscriptions/") ||
        path === "/api/event-subscriptions" ||
        path.startsWith("/webhooks/") ||
        path === "/webhooks"
      ) {
        return await handleWebhooksModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/realtime/") ||
        path === "/api/realtime" ||
        path.startsWith("/api/sync/firebase-supabase") ||
        path.startsWith("/realtime/") ||
        path === "/realtime"
      ) {
        return await handleRealtimeSyncModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/lms/") ||
        path === "/api/lms" ||
        path.startsWith("/api/courses/") ||
        path === "/api/courses" ||
        path.startsWith("/academy/") ||
        path === "/academy" ||
        path.startsWith("/courses/") ||
        path === "/courses"
      ) {
        return await handleLMSModule(request, env, ctx);
      }

      if (
        path.startsWith("/api/funnels/") ||
        path === "/api/funnels" ||
        path.startsWith("/funnel/") ||
        path === "/funnel"
      ) {
        return await handleFunnelsModule(request, env, ctx);
      }

      if (path.startsWith("/api/edge/stock") || path.startsWith("/stock")) {
        return await handlePosStock(request, env, ctx);
      }

      const isNsoreShop = hostname.endsWith(".nsore.shop");
      const isMerchantSubdomain =
        hostname.endsWith(".nanasore.com") &&
        !["www", "app", "api", "admin", "cdn"].includes(hostname.replace(".nanasore.com", ""));
      const isStudioPath =
        path.startsWith("/api/studio/") ||
        path === "/api/studio" ||
        path.startsWith("/shop") ||
        path.startsWith("/boutique");

      if (isNsoreShop || isMerchantSubdomain || isStudioPath) {
        return await handleStudioModule(request, env, ctx);
      }

      return await handleGlobalRouterFallback(request, env, ctx);
    } catch (error) {
      console.error("[EDGE WORKER CRITICAL ERROR]", error);
      try {
        return await handleGlobalRouterFallback(request, env, ctx);
      } catch (fallbackError) {
        return jsonResponse({
          success: false,
          error: "Erreur d'exécution critique du Cloudflare Worker",
          details: error.message,
        }, 500);
      }
    }
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}
