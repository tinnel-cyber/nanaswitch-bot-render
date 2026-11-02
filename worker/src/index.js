/**
 * Routeur Central Cloudflare Worker - Nanasore Edge
 * Emplacement : worker/src/index.js
 */

import { handlePosStock } from "./modules/pos-stock.js";
import { handlePOSModule } from "./modules/app-pos.js";
import { handleStudioModule } from "./modules/app-studio.js";
import { handleWameetModule } from "./modules/app-wameet.js";
import { handleWameetMediaModule } from "./modules/srv-wameet-media.js";
import { handleNanageneratorModule } from "./modules/app-nanagenerator.js";
import { handleTinnelaModule } from "./modules/app-tinnela.js";
import { handleLiveShoppingModule } from "./modules/app-liveshopping.js";
import { handleSignatureModule } from "./modules/app-signature.js";
import { handleLMSModule } from "./modules/app-lms.js";
import { handleFunnelsModule } from "./modules/app-funnels.js";
import { handleScannerModule } from "./modules/app-scanner.js";
import { handleWebinarModule } from "./modules/app-webinar.js";
import { handleDocuSignModule } from "./modules/app-docusign.js";
import { handleInvoicesOrdersModule } from "./modules/app-invoices-orders.js";
import { handleCrmAutomationModule } from "./modules/srv-crm-automation.js";
import { handleThemeBuilderModule } from "./modules/srv-theme-builder.js";
import { handleSmsModule } from "./modules/srv-sms.js";
import { handleDeliveryModule } from "./modules/srv-delivery.js";
import { handlePaymentModule } from "./modules/srv-payment.js";
import { handlePartnerModule } from "./modules/srv-partner.js";
import { handleCourseCreateModule } from "./modules/srv-course-create.js";
import { handleNanaSwitchModule } from "./modules/srv-nana-switch.js";
import { handleVipSupportModule } from "./modules/srv-vip-support.js";
import { handleInventoryModule } from "./modules/mod-inventory.js";
import { handleBookingModule } from "./modules/mod-booking.js";
import { handleSubscriptionsModule } from "./modules/mod-subscriptions.js";
import { handleDebtsModule } from "./modules/mod-debts.js";
import { handleAdsManagerModule } from "./modules/mod-ads-manager.js";
import { handleContractsModule } from "./modules/mod-contracts.js";
import { handleSuppliersModule } from "./modules/mod-suppliers.js";
import { handlePayrollModule } from "./modules/mod-payroll.js";
import { handleTreasuryModule } from "./modules/mod-treasury.js";
import { handleLoyaltyModule } from "./modules/mod-loyalty.js";
import { handleAnalyticsModule } from "./modules/srv-analytics.js";
import { handleSearchEngineModule } from "./modules/srv-search-engine.js";
import { handleWorkflowsModule } from "./modules/srv-workflows.js";
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
  /**
   * Point d'entrée principal des requêtes Edge
   * @param {Request} request 
   * @param {object} env Liaisons KV & variables déclarées dans wrangler.toml
   * @param {object} ctx ExecutionContext Cloudflare
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const hostname = url.hostname;
    const RENDER_BACKEND_URL = env.RENDER_BACKEND_URL || "nanasore.onrender.com";

    // 1. Gestion des requêtes de pré-vol CORS (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    try {
      // 2. Aiguillage Module 37 : Monitoring de Santé & Health Checks Système (srv-health)
      if (
        path.startsWith("/api/health") ||
        path.startsWith("/health") ||
        path.startsWith("/ping") ||
        path === "/ping"
      ) {
        return await handleHealthModule(request, env, ctx);
      }

      // Route de Diagnostic & Inventaire des routes Edge
      if (path === "/routes" || path === "/api/routes") {
        return jsonResponse({
          status: "healthy",
          service: env.APP_NAME || "Nanasore Edge Worker",
          environment: env.ENVIRONMENT || "production",
          backendUrl: RENDER_BACKEND_URL,
          timestamp: new Date().toISOString(),
          kvBound: Boolean(env.PRODUCT_STOCK_KV),
          routes: [
            "ALL  /health, /ping, /api/health* (Module 37 - Monitoring de Santé & Health Checks)",
            "ALL  /sitemap.xml, /robots.txt, /api/seo/*, /api/og/*, Social Bots (Module 39 - SEO & Open Graph Dynamique)",
            "ALL  /api/pos/scan*, /api/scanner/*, /api/barcode/* (Module 10 - Scanner Douchette KV < 5ms)",
            "ALL  /api/pos/* (Module 1 - Caisse Tactile Magasin)",
            "ALL  *.nsore.shop, /api/studio/*, /shop/* (Module 2 - Vitrine en Ligne E-Shop)",
            "ALL  /api/wameet/*, /wameet/reels*, /wameet/live*, /wameet/stream* (Media WaMeet, Reels & Live Résonnance - srv-wameet-media)",
            "ALL  /wameet/* (Module 3 - Wameet Réseau Pro & Messagerie)",
            "ALL  /api/nanagenerator/*, /api/ai/nanagenerator* (Module 4 - Nanagénérateur AI)",
            "ALL  /api/tinnela/*, /api/nana-ai/*, /api/ai/tinnela* (Module 5 - NaNa AI Studio & Avatars)",
            "ALL  /api/liveshopping/*, /live/* (Module 6 - Live Shopping Ventes Flash)",
            "ALL  /api/webinar/*, /api/live-studio/*, /webinar/* (Module 11 - Studio Live & Webinaire)",
            "ALL  /api/signature/*, /sign/* (Module 7 - Signature Numérique & Contrats)",
            "ALL  /api/docusign/*, /api/doc-verify/*, /docusign/* (Module 12 - DocuSign Hub & Contrats Signés)",
            "ALL  /api/invoices-orders/*, /api/orders/*, /quote/*, /order/* (Module 13 - Bons de Commande & Devis)",
            "ALL  /api/crm/*, /webhooks/crm/* (Module 14 - CRM et Webhooks)",
            "ALL  /api/themes/*, /api/theme-builder/*, /assets/themes/* (Module 15 - Choix & Construction de Thèmes)",
            "ALL  /api/sms/*, /api/marketing/*, /api/wallet/sms (Module 16 - Campagnes Marketing & SMS Directs)",
            "ALL  /api/delivery/*, /api/heatmap/*, /delivery/* (Module 17 - Livraisons & Suivi Heatmap en Direct)",
            "ALL  /api/payment/*, /api/mobile-money/*, /webhooks/payment/* (Module 18 - Passerelles de Paiement Mobile Money)",
            "ALL  /api/partner/*, /api/affiliate/*, /ref/* (Module 19 - Espace Partenaire & Affiliation)",
            "ALL  /api/course-create/*, /api/lms-structure/*, /courses/* (Module 20 - Création de Cours LMS)",
            "ALL  /api/nana-switch/*, /api/multi-store/*, /switch-store/* (Module 21 - NaNa Switch Cloud Multi-Comptes)",
            "ALL  /api/vip-support/*, /api/whatsapp-support/*, /support/vip/*, /ticket/*, /tickets/*, /api/tickets/* (Module 22 - Support VIP & Tickets)",
            "ALL  /api/inventory/*, /api/stock-alert/*, /inventory/* (Module 23 - Stock & Inventaire Intelligent)",
            "ALL  /api/booking/*, /api/appointments/*, /booking/* (Module 24 - Système de Réservation & RDV)",
            "ALL  /api/subscriptions/*, /api/billing-plans/*, /subscriptions/* (Module 25 - Facturation Récurrente & Abonnements)",
            "ALL  /api/debts/*, /api/customer-credits/*, /debts/* (Module 26 - Gestion des Dettes & Ardoises)",
            "ALL  /api/ads/*, /api/campaigns-ads/*, /ads/* (Module 27 - Campagnes d'Affichage & Ads)",
            "ALL  /api/contracts/*, /api/legal-templates/*, /contracts/* (Module 28 - Modèles de Contrats & CGV)",
            "ALL  /api/suppliers/*, /api/procurement/*, /suppliers/* (Module 29 - Gestion Fournisseurs & Achats)",
            "ALL  /api/payroll/*, /api/attendance/*, /payroll/* (Module 30 - Gestion Paie & Présences)",
            "ALL  /api/treasury/*, /api/budget/*, /treasury/* (Module 31 - Suivi Budgétaire & Trésorerie)",
            "ALL  /api/loyalty/*, /api/rewards/*, /loyalty/* (Module 32 - Programme de Fidélité & Tiers VIP)",
            "ALL  /api/analytics/*, /api/stats/*, /analytics/* (Module 33 - Tableau de Bord Analytique & Stats)",
            "ALL  /api/search/*, /api/index-query/*, /search/* (Module 34 - Moteur de Recherche Global)",
            "ALL  /api/workflows/*, /api/automation/*, /workflows/* (Module 35 - Workflows & Triggers Cloud)",
            "ALL  /api/webhooks/*, /api/event-subscriptions/*, /webhooks/* (Module 36 - Événements & Webhooks sortants)",
            "ALL  /api/realtime/*, /api/sync/firebase-supabase, /realtime/* (Synchronisation Temps Réel Firebase-Supabase - srv-realtime-sync)",
            "ALL  * (Module 38 - Routeur Global & Failover d'Urgence - srv-router)",
            "ALL  /api/lms/*, /api/courses/*, /academy/* (Module 8 - Académie & Formation LMS)",
            "ALL  /api/funnels/*, /funnel/* (Module 9 - Tunnels de Vente & Funnels)",
            "GET  /api/edge/stock/:id (Circuit Breaker Stock)",
            "POST /api/edge/stock/verify",
            "POST /api/edge/stock/sync",
          ],
        });
      }

      // 3. Aiguillage Module 39 : SEO & Open Graph Dynamique (srv-seo-og)
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
        "bingbot"
      ].some(bot => userAgent.includes(bot));

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

      // 3. Aiguillage Module 10 : Scanner Physique Code-Barres & QR (app-scanner)
      // Placé AVANT /api/pos/ pour intercepter /api/pos/scan immédiatement à l'Edge (0 requête Render si en KV)
      if (
        path.startsWith("/api/pos/scan") ||
        path.startsWith("/api/scanner/") ||
        path === "/api/scanner" ||
        path.startsWith("/api/barcode/") ||
        path === "/api/barcode"
      ) {
        return await handleScannerModule(request, env, ctx);
      }

      // 4. Aiguillage Module 1 : Caisse Tactile Magasin (POS)
      if (path.startsWith("/api/pos/") || path === "/api/pos") {
        return await handlePOSModule(request, env, RENDER_BACKEND_URL);
      }

      // 5. Aiguillage Media WaMeet (Reels, Live Résonnance & HLS) - srv-wameet-media
      if (
        path.startsWith("/api/wameet/") ||
        path === "/api/wameet" ||
        path.startsWith("/wameet/reels") ||
        path.startsWith("/wameet/live") ||
        path.startsWith("/wameet/stream")
      ) {
        return await handleWameetMediaModule(request, env, ctx);
      }

      // 5b. Aiguillage Module 3 : Wameet (Réseau Social Pro & Messagerie)
      if (path.startsWith("/wameet/") || path === "/wameet") {
        return await handleWameetModule(request, env, ctx);
      }

      // 6. Aiguillage Module 4 : Nanagénérateur AI (Création de vidéos et visuels publicitaires)
      if (
        path.startsWith("/api/nanagenerator/") ||
        path === "/api/nanagenerator" ||
        path.startsWith("/api/ai/nanagenerator")
      ) {
        return await handleNanageneratorModule(request, env, ctx);
      }

      // 7. Aiguillage Module 5 : NaNa AI Studio & Avatars (app-tinnela)
      if (
        path.startsWith("/api/tinnela/") ||
        path === "/api/tinnela" ||
        path.startsWith("/api/nana-ai/") ||
        path === "/api/nana-ai" ||
        path.startsWith("/api/ai/tinnela")
      ) {
        return await handleTinnelaModule(request, env, ctx);
      }

      // 8. Aiguillage Module 11 : Studio de Génération de Live & Webinaire (app-webinar)
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

      // 9. Aiguillage Module 6 : Live Shopping (app-liveshopping)
      if (
        path.startsWith("/api/liveshopping/") ||
        path === "/api/liveshopping" ||
        path.startsWith("/live/") ||
        path === "/live"
      ) {
        return await handleLiveShoppingModule(request, env, ctx);
      }

      // 10. Aiguillage Module 7 : Signature Numérique & Contrats (app-signature)
      if (
        path.startsWith("/api/signature/") ||
        path === "/api/signature" ||
        path.startsWith("/sign/") ||
        path === "/sign"
      ) {
        return await handleSignatureModule(request, env, ctx);
      }

      // 11. Aiguillage Module 12 : DocuSign Hub & Contrats Signés (app-docusign)
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

      // 12. Aiguillage Module 13 : Bons de Commande & Devis / Projets (app-invoices-orders)
      if (
        path.startsWith("/api/invoices-orders/") ||
        path === "/api/invoices-orders" ||
        path.startsWith("/api/orders/") ||
        path === "/api/orders" ||
        path.startsWith("/quote/") ||
        path === "/quote" ||
        path.startsWith("/order/") ||
        path === "/order"
      ) {
        return await handleInvoicesOrdersModule(request, env, ctx);
      }

      // 13. Aiguillage Module 14 : CRM et Automatisation (srv-crm-automation)
      if (
        path.startsWith("/api/crm/") ||
        path === "/api/crm" ||
        path.startsWith("/webhooks/crm/") ||
        path === "/webhooks/crm"
      ) {
        return await handleCrmAutomationModule(request, env, ctx);
      }

      // 14. Aiguillage Module 15 : Studio de Choix et Construction de Thèmes (srv-theme-builder)
      if (
        path.startsWith("/api/themes/") ||
        path === "/api/themes" ||
        path.startsWith("/api/theme-builder/") ||
        path === "/api/theme-builder" ||
        path.startsWith("/assets/themes/")
      ) {
        return await handleThemeBuilderModule(request, env, ctx);
      }

      // 15. Aiguillage Module 16 : Campagnes Marketing & SMS Directs (srv-sms)
      if (
        path.startsWith("/api/sms/") ||
        path === "/api/sms" ||
        path.startsWith("/api/marketing/") ||
        path === "/api/marketing" ||
        path.startsWith("/api/wallet/sms")
      ) {
        return await handleSmsModule(request, env, ctx);
      }

      // 16. Aiguillage Module 17 : Livraisons & Suivi Heatmap en Direct (srv-delivery)
      if (
        path.startsWith("/api/delivery/") ||
        path === "/api/delivery" ||
        path.startsWith("/api/heatmap/") ||
        path === "/api/heatmap" ||
        path.startsWith("/delivery/") ||
        path === "/delivery"
      ) {
        return await handleDeliveryModule(request, env, ctx);
      }

      // 17. Aiguillage Module 18 : Passerelles de Paiement Mobile Money (srv-payment)
      if (
        path.startsWith("/api/payment/") ||
        path === "/api/payment" ||
        path.startsWith("/api/mobile-money/") ||
        path === "/api/mobile-money" ||
        path.startsWith("/webhooks/payment/") ||
        path === "/webhooks/payment"
      ) {
        return await handlePaymentModule(request, env, ctx);
      }

      // 18. Aiguillage Module 19 : Espace Partenaire & Affiliation (srv-partner)
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

      // 19. Aiguillage Module 20 : Centre de Création de Cours et Formations (srv-course-create)
      if (
        path.startsWith("/api/course-create/") ||
        path === "/api/course-create" ||
        path.startsWith("/api/lms-structure/") ||
        path === "/api/lms-structure" ||
        path.startsWith("/courses/") ||
        path === "/courses"
      ) {
        return await handleCourseCreateModule(request, env, ctx);
      }

      // 20. Aiguillage Module 21 : NaNa Switch Cloud (Multi-Comptes) (srv-nana-switch)
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

      // 21. Aiguillage Module 22 : Conciergerie, Support VIP & Tickets (srv-vip-support)
      if (
        path.startsWith("/api/vip-support/") ||
        path === "/api/vip-support" ||
        path.startsWith("/api/whatsapp-support/") ||
        path === "/api/whatsapp-support" ||
        path.startsWith("/support/vip/") ||
        path === "/support/vip" ||
        path.startsWith("/api/tickets/") ||
        path === "/api/tickets" ||
        path.startsWith("/ticket/") ||
        path === "/ticket" ||
        path.startsWith("/tickets/") ||
        path === "/tickets"
      ) {
        return await handleVipSupportModule(request, env, ctx);
      }

      // 22. Aiguillage Module 23 : Stock & Inventaire Intelligent (mod-inventory)
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

      // 23. Aiguillage Module 24 : Système de Réservation & Rendez-vous (mod-booking)
      if (
        path.startsWith("/api/booking/") ||
        path === "/api/booking" ||
        path.startsWith("/api/appointments/") ||
        path === "/api/appointments" ||
        path.startsWith("/booking/") ||
        path === "/booking"
      ) {
        return await handleBookingModule(request, env, ctx);
      }

      // 24. Aiguillage Module 25 : Facturation Récurrente & Abonnements (mod-subscriptions)
      if (
        path.startsWith("/api/subscriptions/") ||
        path === "/api/subscriptions" ||
        path.startsWith("/api/billing-plans/") ||
        path === "/api/billing-plans" ||
        path.startsWith("/subscriptions/") ||
        path === "/subscriptions"
      ) {
        return await handleSubscriptionsModule(request, env, ctx);
      }

      // 25. Aiguillage Module 26 : Gestion des Dettes & Ardoises Clients (mod-debts)
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

      // 26. Aiguillage Module 27 : Campagnes d'Affichage & Publicités Intégrées (mod-ads-manager)
      if (
        path.startsWith("/api/ads/") ||
        path === "/api/ads" ||
        path.startsWith("/api/campaigns-ads/") ||
        path === "/api/campaigns-ads" ||
        path.startsWith("/ads/") ||
        path === "/ads"
      ) {
        return await handleAdsManagerModule(request, env, ctx);
      }

      // 27. Aiguillage Module 28 : Générateur de Contrats & Signatures Numériques (mod-contracts)
      if (
        path.startsWith("/api/contracts/") ||
        path === "/api/contracts" ||
        path.startsWith("/api/legal-templates/") ||
        path === "/api/legal-templates" ||
        path.startsWith("/contracts/") ||
        path === "/contracts"
      ) {
        return await handleContractsModule(request, env, ctx);
      }

      // 28. Aiguillage Module 29 : Gestion des Fournisseurs & Achats (mod-suppliers)
      if (
        path.startsWith("/api/suppliers/") ||
        path === "/api/suppliers" ||
        path.startsWith("/api/procurement/") ||
        path === "/api/procurement" ||
        path.startsWith("/suppliers/") ||
        path === "/suppliers"
      ) {
        return await handleSuppliersModule(request, env, ctx);
      }

      // 29. Aiguillage Module 30 : Gestion de la Paie & Présences Employés (mod-payroll)
      if (
        path.startsWith("/api/payroll/") ||
        path === "/api/payroll" ||
        path.startsWith("/api/attendance/") ||
        path === "/api/attendance" ||
        path.startsWith("/payroll/") ||
        path === "/payroll"
      ) {
        return await handlePayrollModule(request, env, ctx);
      }

      // 30. Aiguillage Module 31 : Suivi Budgétaire & Trésorerie en Temps Réel (mod-treasury)
      if (
        path.startsWith("/api/treasury/") ||
        path === "/api/treasury" ||
        path.startsWith("/api/budget/") ||
        path === "/api/budget" ||
        path.startsWith("/treasury/") ||
        path === "/treasury"
      ) {
        return await handleTreasuryModule(request, env, ctx);
      }

      // 31. Aiguillage Module 32 : Programme de Fidélisation & Récompenses VIP (mod-loyalty)
      if (
        path.startsWith("/api/loyalty/") ||
        path === "/api/loyalty" ||
        path.startsWith("/api/rewards/") ||
        path === "/api/rewards" ||
        path.startsWith("/loyalty/") ||
        path === "/loyalty"
      ) {
        return await handleLoyaltyModule(request, env, ctx);
      }

      // 32. Aiguillage Module 33 : Tableau de Bord Analytique & Statistiques (srv-analytics)
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

      // 33. Aiguillage Module 34 : Moteur de Recherche Global & Indexation (srv-search-engine)
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

      // 34. Aiguillage Module 35 : Automatisation des Workflows & Triggers Cloud (srv-workflows)
      if (
        path.startsWith("/api/workflows/") ||
        path === "/api/workflows" ||
        path.startsWith("/api/automation/") ||
        path === "/api/automation" ||
        path.startsWith("/workflows/") ||
        path === "/workflows"
      ) {
        return await handleWorkflowsModule(request, env, ctx);
      }

      // 35. Aiguillage Module 36 : Gestion des Événements & Webhooks sortants (srv-webhooks)
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

      // 36. Aiguillage Synchronisation Temps Réel Firebase-Supabase (srv-realtime-sync)
      if (
        path.startsWith("/api/realtime/") ||
        path === "/api/realtime" ||
        path.startsWith("/api/sync/firebase-supabase") ||
        path.startsWith("/realtime/") ||
        path === "/realtime"
      ) {
        return await handleRealtimeSyncModule(request, env, ctx);
      }

      // 15. Aiguillage Module 8 : Académie & Formation LMS (app-lms)
      if (
        path.startsWith("/api/lms/") ||
        path === "/api/lms" ||
        path.startsWith("/api/courses/") ||
        path === "/api/courses" ||
        path.startsWith("/academy/") ||
        path === "/academy"
      ) {
        return await handleLMSModule(request, env, ctx);
      }

      // 16. Aiguillage Module 9 : Automatisation & Funnels de Vente (app-funnels)
      if (
        path.startsWith("/api/funnels/") ||
        path === "/api/funnels" ||
        path.startsWith("/funnel/") ||
        path === "/funnel"
      ) {
        return await handleFunnelsModule(request, env, ctx);
      }

      // 17. Aiguillage Module Circuit Breaker Stock à l'Edge
      if (path.startsWith("/api/edge/stock") || path.startsWith("/stock")) {
        return await handlePosStock(request, env, ctx);
      }

      // 18. Aiguillage Module 2 : Vitrine en Ligne (E-Shop) - app-studio
      // Détecte les domaines *.nsore.shop, sous-domaines marchands *.nanasore.com ou routes dédiées
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

      // 19. Aiguillage Application Principale & Routeur Global (srv-router)
      // Acheminement direct de la racine "/" et de toutes les pages d'application vers Render
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
