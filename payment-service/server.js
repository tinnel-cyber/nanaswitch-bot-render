/**
 * Micro-service Express de Transactions Financières, Webhooks & NaNaSwitch Cloud Node
 * - Nœud Cloud Sécurisé NaNaSwitch Cloud avec isolation d'infrastructure Zero-Trust
 * - Sortie réseau garantie par IP Statique Fixie pour l'IP Whitelisting bancaire
 * - Validation cryptographique HMAC-SHA256, Chiffrement AES-256-GCM & Idempotence stricte
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();

// Suppression expresse de tout proxy global pour empêcher les services externes ou les pings de passer par Fixie
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.ALL_PROXY;
delete process.env.all_proxy;
const http = require('http');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { getSupabaseAdmin: _getSupabaseAdmin, checkSupabaseHealth, sanitizeRedirectUrl } = require('./supabase-admin');
const { FIXIE_URL, fetchViaFixie, getOutboundIp } = require('./fixie-proxy');
const {
  SEBPAY_DEFAULT_BASE_URL,
  SEBPAY_SUPPORTED_COUNTRIES_FALLBACK,
  SEBPAY_FEE_RATES,
  getSebpayBaseUrl,
  getSebpayHeaders,
  getSebpayConfigStatus,
  callSebpayApi,
  createSebpayCollection,
  createSebpayCheckoutSession,
  getSebpayCollection,
  getSebpayCheckoutSession,
  getSebpayCountries,
  getSebpayOperators,
  calculateSebpayFee
} = require('./sebpay-client');
const {
  createSaspayPayin,
  createSaspayPayout,
  verifySaspayPayment,
  verifySaspayPayout,
  verifySaspayWebhookSignature,
  getSaspayConfigStatus,
  SASPAY_SUPPORTED_COUNTRIES
} = require('./saspay-client');
const {
  generateYouTubeAuthUrl,
  exchangeCodeForTokens,
  saveYouTubeTokensToFirestore,
  getYouTubeOAuthStatus
} = require('./youtube-oauth');
const { switchManager } = require('./nana-switch/switch-manager');
const {
  startLiveSession,
  getDailyQuotaStatus,
  checkDailyYouTubeQuota
} = require('./live-manager');
const { analyzeChatIntent, DEFAULT_MOCK_INVENTORY } = require('./ai-checkout');
const { createChatFinanceRouter } = require('./chat-finance-controller');
const { LiveCommerceEngine, createLiveCommerceRouter } = require('./live-commerce-controller');
const { merchantService, DEFAULT_PRICING_MATRIX } = require('./nana-switch/merchant-service');
const { pricingEngine } = require('./nana-switch/pricingEngine');
const {
  KYC_LIMITS,
  resolveMerchantKycTier,
  getMerchantMonthlyLimit,
  getMerchantMonthlyVolume,
  checkTransactionLimit,
  recordTransactionVolume,
  checkTransactionLimitMiddleware
} = require('./middleware/checkTransactionLimit');
const webhookNotifier = require('./nana-switch/webhookNotifier');
const {
  generateNanaSwitchKeyPair,
  requireNanaSwitchAuth,
  optionalNanaSwitchAuth
} = require('./nana-switch/validateNanaSwitchKey');

const { getSupabaseAdmin } = require('./supabase-admin');

const app = express();
const PAYMENT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || '';
const PROJECT_ID = process.env.PROJECT_ID || 'nanasore';

function timingSafeStrEqual(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Middleware d'authentification stricte pour les routes financières/admin critiques
 * (payouts, bank-proxy, coffre AES, gestion des clés marchands, config switch).
 */
async function requireInternalAdminAuth(req, res, next) {
  try {
    const adminSecret =
      process.env.INTERNAL_ADMIN_KEY ||
      process.env.ADMIN_API_KEY ||
      process.env.NANASWITCH_INTERNAL_KEY ||
      '';
    const providedApiKey =
      req.headers['x-internal-admin-key'] ||
      req.headers['x-admin-api-key'] ||
      req.headers['x-admin-key'] ||
      req.headers['x-internal-secret'] ||
      req.headers['x-nanaswitch-skey'] ||
      req.headers['x-api-key'] ||
      '';
    const authHeader = req.headers['authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (adminSecret && (timingSafeStrEqual(providedApiKey, adminSecret) || timingSafeStrEqual(bearerToken, adminSecret))) {
      req.isInternalAdmin = true;
      return next();
    }

    // Alternative : JWT Supabase vérifié appartenant OBLIGATOIREMENT à un Super Admin en base (Audit C3)
    if (bearerToken) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data: { user }, error } = await supabase.auth.getUser(bearerToken);
        if (!error && user) {
          const { data: superAdmin } = await supabase
            .from('super_admins')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (superAdmin) {
            req.authUser = user;
            req.isInternalAdmin = true;
            return next();
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (profile && String(profile.role).toLowerCase() === 'super_admin') {
            req.authUser = user;
            req.isInternalAdmin = true;
            return next();
          }
        }
      }
    }

    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Accès refusé. Clé interne admin ou rôle Super-Administrateur requis.'
    });
  } catch (err) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
}

const ALLOWED_BANK_PROXY_HOSTS = new Set([
  'newapi.sebpay.bj',
  'api.sebpay.bj',
  'api.saspay.io',
  'pay.saspay.io',
  'api-checkout.cinetpay.com',
  'api.fedapay.com',
  'sandbox-api.fedapay.com',
  'app.paydunya.com',
  'app.ligdicash.com',
  'api.pawapay.cloud',
  'api.stripe.com',
  'api.wave.com'
]);

function isAllowedBankProxyUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_BANK_PROXY_HOSTS.has(host);
  } catch {
    return false;
  }
}

// 1. Persistance unifiée 100% Supabase (Firebase complètement supprimé)
const db = null;
const isDatabaseInitialized = Boolean(getSupabaseAdmin());

// ============================================================================
// GESTIONNAIRE DE SALONS WEBSOCKET TEMPS RÉEL (SMART TRANSACTIONS & LIVE COMMERCE)
// ============================================================================
let wssInstance = null;
const chatRooms = new Map(); // Map<chatId, Set<WebSocketClient>>

// Moteur Live Commerce Wameet x Nanasore
const liveCommerceEngine = new LiveCommerceEngine({ db, fetchViaFixie });

function initWebSocketServer(httpServer) {
  try {
    // Écoute sur toutes les routes WebSocket (/ws/*)
    wssInstance = new WebSocketServer({ server: httpServer });

    wssInstance.on('connection', (ws, req) => {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const chatId = parsedUrl.searchParams.get('chatId');
        const roomId = parsedUrl.searchParams.get('roomId') || parsedUrl.searchParams.get('liveRoomId');
        const userId = parsedUrl.searchParams.get('userId') || 'anon';

        ws.userId = userId;

        // Attache l'API socket.join standard
        ws.join = (targetRoomId) => {
          liveCommerceEngine.joinRoom(ws, targetRoomId, { userId });
        };

        // 1. Branchement sur salon de Chat classique si chatId présent
        if (chatId) {
          ws.chatId = chatId;
          if (!chatRooms.has(chatId)) {
            chatRooms.set(chatId, new Set());
          }
          chatRooms.get(chatId).add(ws);
          console.log(`[WEBSOCKET] Client ${userId} connecté au chat ${chatId} (${chatRooms.get(chatId).size} actifs).`);
        }

        // 2. Branchement direct sur salon Live si roomId présent dans l'URL
        if (roomId) {
          liveCommerceEngine.joinRoom(ws, roomId, { userId });
        }

        // Accusé de réception
        ws.send(JSON.stringify({
          event: 'connection_ack',
          data: { chatId: chatId || null, roomId: roomId || null, userId, status: 'connected', timestamp: Date.now() }
        }));

        ws.on('message', async (message) => {
          try {
            const raw = message.toString();
            if (raw === 'ping') {
              ws.send('pong');
              return;
            }
            const parsed = JSON.parse(raw);
            const eventName = parsed.event || parsed.type;
            const data = parsed.data || parsed;

            // Routage des événements Smart Chat Transactions
            if (eventName === 'send_smart_transaction') {
              console.log(`[WEBSOCKET] Transaction émise pour ${chatId || data.chatId} :`, data.transactionId);
              broadcastToChat(chatId || data.chatId, 'smart_transaction_received', data, ws);
            }
            // Routage des événements Live Commerce (Salons, Push Product, Achat Rapide)
            else if (eventName === 'join_live_room' || eventName === 'socket_join') {
              const targetRoomId = data.roomId || data.liveRoomId || (typeof data === 'string' ? data : null);
              if (targetRoomId) {
                ws.join(targetRoomId);
              }
            } else if (eventName === 'seller_push_product') {
              const targetRoomId = data.roomId || roomId;
              if (targetRoomId) {
                await liveCommerceEngine.handleSellerPushProduct(targetRoomId, data);
              }
            } else if (eventName === 'buy_live_product') {
              const buyResult = await liveCommerceEngine.handleBuyLiveProduct(data);
              ws.send(JSON.stringify({ event: 'buy_live_product_ack', data: buyResult }));
            } else if (eventName === 'ping') {
              ws.send(JSON.stringify({ event: 'pong', timestamp: Date.now() }));
            }
          } catch (err) {
            console.warn('[WEBSOCKET] Erreur décodage message :', err.message);
          }
        });

        ws.on('close', () => {
          if (ws.chatId) {
            const room = chatRooms.get(ws.chatId);
            if (room) {
              room.delete(ws);
              if (room.size === 0) chatRooms.delete(ws.chatId);
            }
          }
          liveCommerceEngine.handleSocketDisconnect(ws);
          console.log(`[WEBSOCKET] Client ${userId} déconnecté.`);
        });

        ws.on('error', (err) => {
          console.warn(`[WEBSOCKET NOTICE] Erreur socket client ${userId} :`, err.message);
        });
      } catch (connErr) {
        console.warn('[WEBSOCKET] Erreur connexion client :', connErr.message);
      }
    });

    console.log('[WEBSOCKET] Serveur WebSocket initialisé (Smart Chat + Live Commerce).');
  } catch (err) {
    console.warn('[WEBSOCKET] Échec initialisation WebSocket :', err.message);
  }
}

function broadcastToChat(chatId, event, data, senderWs = null) {
  if (!chatId) return;
  const room = chatRooms.get(chatId);
  if (!room || room.size === 0) return;

  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  for (const client of room) {
    if (client !== senderWs && client.readyState === 1 /* OPEN */) {
      try {
        client.send(payload);
      } catch (err) {
        console.warn('[WEBSOCKET] Erreur envoi client :', err.message);
      }
    }
  }
}

// 2. Middlewares de Sécurité, En-têtes HTTP, Rate Limiting & CORS strict
const ALLOWED_CORS_ORIGINS = new Set([
  'https://nsore.shop',
  'https://www.nsore.shop',
  'https://nanasore.com',
  'https://www.nanasore.com',
  'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run',
  'http://localhost:3000',
  'http://localhost:5173',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean) : [])
]);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Rate limiter léger (120 req/min par IP, exemptant /health et les webhooks signés)
const rateLimitStore = new Map();
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [k, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < cutoff) rateLimitStore.delete(k);
  }
}, 60_000).unref();

app.use((req, res, next) => {
  if (req.path === '/health' || req.path.includes('webhook')) return next();
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const now = Date.now();
  let entry = rateLimitStore.get(ip);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + 60_000 };
    if (rateLimitStore.size > 10000) rateLimitStore.clear();
    rateLimitStore.set(ip, entry);
  }
  entry.count += 1;
  if (entry.count > 120) {
    return res.status(429).json({ success: false, error: 'Too Many Requests' });
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_CORS_ORIGINS.has(origin) || origin.endsWith('.nsore.shop') || origin.endsWith('.nanasore.com')) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-admin-api-key',
    'x-internal-secret',
    'x-sebpay-signature',
    'X-SebPay-Signature',
    'x-webhook-signature',
    'x-webhook-timestamp',
    'x-fedapay-signature',
    'x-cinetpay-signature',
    'x-signature-sha256',
    'x-api-key',
    'x-nanaswitch-skey',
    'x-nanaswitch-key',
    'x-merchant-id',
    'x-public-key'
  ]
}));

// ============================================================================
// ROUTE 1 : Diagnostic & Contrôle de l'Adresse IP Statique Fixie (avec Cache)
// ============================================================================
/**
 * GET /api/payment/ip
 * Diagnostic de l'IP statique sortante Fixie (résultat mis en cache 1h pour éviter
 * toute surconsommation par les robots de monitoring).
 */
app.get('/api/payment/ip', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const gateway = req.query.gateway || 'sebpay';
    const ipResult = await getOutboundIp(force, gateway);
    return res.json({
      status: 'success',
      service: 'nana-payment-gateway',
      targetGateway: gateway,
      ...ipResult,
      whitelistingInstructions: ipResult.success
        ? `Ajoutez l'adresse IP ${ipResult.ip} dans la liste blanche (IP Whitelisting) de votre partenaire (${gateway}).`
        : `Vérifiez les variables SEBPAY_FIXIE_URL / SASPAY_FIXIE_URL / FIXIE_URL sur Render.`
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la détection de l\'adresse IP',
      details: err.message
    });
  }
});

// ============================================================================
// ROUTE 2 : Healthcheck Render & Monitoring (Réponse 100% Locale, ZÉRO appel réseau Fixie)
// ============================================================================
app.get(['/', '/health', '/api/health', '/healthz', '/ping', '/api/ping'], async (req, res) => {
  const dbHealthy = await checkSupabaseHealth();
  return res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'online' : 'degraded',
    service: 'nana-payment-gateway-api',
    version: '2.3.0-supabase',
    environment: process.env.NODE_ENV || 'production',
    proxyStrategy: {
      globalProxy: false,
      sebpayProxyConfigured: Boolean(process.env.SEBPAY_FIXIE_URL || process.env.FIXIE_URL_SEBPAY || process.env.FIXIE_URL),
      saspayProxyConfigured: Boolean(process.env.SASPAY_FIXIE_URL || process.env.FIXIE_URL_SASPAY || process.env.FIXIE_URL),
      globalFallbackConfigured: Boolean(process.env.FIXIE_URL),
      failoverReady: true
    },
    aggregators: {
      sebpay: Boolean(process.env.SEBPAY_PUBLIC_KEY && process.env.SEBPAY_SECRET_KEY),
      saspay: Boolean(process.env.SASPAY_SECRET_KEY || process.env.SASPAY_API_KEY)
    },
    databaseProvider: 'supabase',
    databaseConnected: dbHealthy,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// ROUTE 2b : Statut & Diagnostic Sebpay (Sécurité stricte : X-Secret-Key masquée)
// ============================================================================
app.get('/api/payment/sebpay/status', (req, res) => {
  const sebpayConfig = getSebpayConfigStatus();
  return res.json({
    success: true,
    service: 'sebpay-bridge',
    ...sebpayConfig
  });
});

// ============================================================================
// ROUTE 2c : Statut & Diagnostic Saspay (Sécurité stricte : Secret Key masquée)
// ============================================================================
app.get('/api/payment/saspay/status', (req, res) => {
  const saspayConfig = getSaspayConfigStatus();
  return res.json({
    success: true,
    service: 'saspay-bridge',
    ...saspayConfig
  });
});

// ============================================================================
// ============================================================================
// ROUTE 3 : Webhook Critique Sebpay & Opérateurs (HMAC-SHA256 & Règle des 5s)
// ============================================================================
/**
 * POST /api/payment/webhook & POST /api/webhooks/payment
 * Réceptionne et valide les notifications serveur-à-serveur avec buffer brut (express.raw)
 * pour garantir que le formatage exact des octets reçus de Sebpay est préservé pour le HMAC.
 */
app.post(
  [
    '/webhook/sebpay',
    '/api/webhook/sebpay',
    '/api/payment/webhook',
    '/api/webhooks/payment',
    '/api/payments/webhook/sebpay',
    '/api/payment/webhook/sebpay'
  ],
  express.raw({ type: 'application/json', limit: '5mb' }),
  async (req, res) => {
    try {
      const rawBuffer = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(req.rawBody || req.body || '', 'utf8');

      // Détection automatique si notification SasPay arrivant sur l'endpoint unifié
      const isSaspayEvent = Boolean(req.headers['x-webhook-event'] || req.headers['X-Webhook-Event'] || req.headers['x-webhook-timestamp']);
      if (isSaspayEvent) {
        const sasSig = req.headers['x-saspay-signature'] || req.headers['X-Saspay-Signature'] || req.headers['x-webhook-signature'] || req.headers['X-Webhook-Signature'];
        const sasTs = req.headers['x-webhook-timestamp'] || req.headers['X-Webhook-Timestamp'] || req.headers['x-saspay-timestamp'];
        const candidateSecrets = [process.env.SASPAY_WEBHOOK_SECRET, process.env.SASPAY_API_KEY, process.env.PAYMENT_WEBHOOK_SECRET].filter(Boolean);
        let sigCheck = { valid: false, reason: 'missing_secret' };
        for (const secret of candidateSecrets) {
          sigCheck = verifySaspayWebhookSignature({ rawBody: rawBuffer, signature: sasSig, timestamp: sasTs, secret });
          if (sigCheck.valid) break;
        }
        if (!sigCheck.valid) {
          console.warn(`[SECURITY REJECT] Webhook SasPay sur /api/payment/webhook invalide : ${sigCheck.reason}`);
          return res.status(401).json({ error: `Signature SasPay invalide (${sigCheck.reason})` });
        }
        const payload = JSON.parse(rawBuffer.toString('utf8'));
        const result = await processWebhookTransaction({ ...payload, provider: 'SASPAY' }, { gateway: 'saspay', signature: sasSig });
        return res.status(200).json({ received: true, ...result });
      }

      // 1. Récupération stricte de la signature X-SebPay-Signature
      const sebpaySignature =
        req.get('X-SebPay-Signature') ||
        req.headers['x-sebpay-signature'] ||
        req.headers['X-SebPay-Signature'] ||
        req.headers['x-webhook-signature'] ||
        req.headers['x-signature-sha256'] ||
        req.headers['x-signature'] ||
        req.headers['X-Signature'];

      if (!sebpaySignature) {
        console.error('[SECURITY REJECT] Webhook Sebpay rejeté : En-tête X-SebPay-Signature manquant.');
        return res.status(401).json({ error: 'Signature cryptographique X-SebPay-Signature absente.' });
      }

      // Anti-rejeu sur timestamp si fourni (Audit M4)
      const sebTimestamp = req.headers['x-webhook-timestamp'] || req.headers['x-sebpay-timestamp'];
      if (sebTimestamp) {
        const tsNum = Number(sebTimestamp);
        const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
        if (!isNaN(tsMs) && Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
          return res.status(401).json({ error: 'Timestamp webhook expiré (anti-rejeu > 5 min).' });
        }
      }

      // Clé secrète Sebpay pour la vérification HMAC
      const secretKey =
        process.env.SEBPAY_WEBHOOK_SECRET ||
        process.env.SEBPAY_SECRET_KEY ||
        process.env.PAYMENT_WEBHOOK_SECRET;

      if (!secretKey) {
        console.error('[SECURITY CONFIG ERROR] process.env.SEBPAY_SECRET_KEY (ou SEBPAY_WEBHOOK_SECRET) non configuré.');
        return res.status(500).json({ error: 'Configuration serveur incomplète (Clé secrète Sebpay manquante).' });
      }

      // 3. Algorithme officiel Sebpay : HMAC-SHA256 hexadécimal à temps constant
      const cleanSignature = String(sebpaySignature).trim().toLowerCase();
      const calculatedHash = crypto.createHmac('sha256', secretKey).update(rawBuffer).digest('hex').toLowerCase();

      const isSignatureValid = cleanSignature.length === calculatedHash.length
        && crypto.timingSafeEqual(Buffer.from(cleanSignature, 'utf8'), Buffer.from(calculatedHash, 'utf8'));

      if (!isSignatureValid) {
        console.error('[SECURITY REJECT] Signature HMAC invalide.');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      let payload = {};
      try {
        payload = JSON.parse(rawBuffer.toString('utf8'));
      } catch (_jsonErr) {
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }

      // 4. Traitement atomique avec inbox (Audit M2, C1, C2)
      const result = await processWebhookTransaction(payload, { gateway: 'sebpay', signature: cleanSignature });
      return res.status(200).json({ received: true, ...result });
    } catch (err) {
      console.error('[FATAL WEBHOOK ERROR]', err.message);
      if (!res.headersSent) {
        const isClientErr = ['MISSING_WEBHOOK_STATUS', 'AMOUNT_MISMATCH', 'ORDER_ALREADY_PAID', 'ORDER_NOT_FOUND'].includes(err.code || err.message);
        return res.status(isClientErr ? 400 : 500).json({ error: err.message, code: err.code || null });
      }
    }
  }
);

// Middlewares JSON & UrlEncoded pour TOUTES les autres routes REST de l'API Render
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// ROUTEUR MOTEUR FINANCIER & SMART ESCROW (WAMEET CHAT-FINANCE)
// POST /api/chat-finance/initiate (Farotage Wallet & CinetPay Escrow)
// POST /api/chat-finance/webhook (Confirmation Mobile Money CinetPay/Sebpay)
// POST /api/chat-finance/release (Libération sécurisée vers Wallet Vendeur)
// GET  /api/chat-finance/wallet/:userId
// ============================================================================
app.use('/api/chat-finance', createChatFinanceRouter({
  db,
  broadcastToChat,
  fetchViaFixie
}));

// ============================================================================
// ROUTEUR MOTEUR LIVE COMMERCE & SYNCHRONISATION PHYGITALE (WAMEET LIVE)
// POST /api/live/stock-update (Webhook Caisse Nanasore -> phygital_scarcity_alert)
// POST /api/live/push-product (Pousse un produit en direct)
// POST /api/live/buy-fast     (Achat rapide Smart Escrow 1-clic)
// GET  /api/live/rooms/:roomId
// ============================================================================
app.use('/api/live', createLiveCommerceRouter({ engine: liveCommerceEngine }));

/**
 * Enregistre le webhook brut dans l'inbox Supabase avant traitement (Audit M2)
 */
async function recordWebhookToInbox(supabase, { gateway, transactionId, orderId, signature, payload }) {
  if (!supabase) return { inboxId: null, duplicate: false };
  try {
    if (transactionId) {
      const { data: existing } = await supabase
        .from('payment_webhook_inbox')
        .select('id, status')
        .eq('gateway', String(gateway).toLowerCase())
        .eq('gateway_transaction_id', String(transactionId))
        .maybeSingle();

      if (existing && existing.status === 'processed') {
        return { inboxId: existing.id, duplicate: true };
      }
      if (existing) {
        return { inboxId: existing.id, duplicate: false };
      }
    }

    const { data: inserted, error } = await supabase
      .from('payment_webhook_inbox')
      .insert({
        gateway: String(gateway).toLowerCase(),
        gateway_transaction_id: transactionId ? String(transactionId) : null,
        order_id: orderId ? String(orderId) : null,
        signature: signature ? String(signature).slice(0, 255) : null,
        raw_payload: payload || {},
        status: 'received'
      })
      .select('id')
      .single();

    if (error && error.code === '23505') {
      return { inboxId: null, duplicate: true };
    }
    return { inboxId: inserted?.id || null, duplicate: false };
  } catch (err) {
    console.warn('[WEBHOOK INBOX NOTICE]', err.message);
    return { inboxId: null, duplicate: false };
  }
}

/**
 * Traitement sécurisé de la transaction webhook 100% Supabase (Audit C1, C2, C4, C5, C6, M2, M3, M5, M7)
 */
async function processWebhookTransaction(payload, options = {}) {
  const txData = payload.data || payload;

  const transactionId = String(
    txData.transaction_id ||
    txData.transactionId ||
    payload.transaction_id ||
    payload.transactionId ||
    txData.id ||
    payload.id ||
    txData.txId ||
    ''
  ).trim();

  const externalRef = String(
    txData.external_reference ||
    payload.external_reference ||
    txData.externalReference ||
    payload.externalReference ||
    txData.reference ||
    payload.reference ||
    ''
  ).trim();

  // Audit C2 : Statut obligatoire ! Jamais de fallback 'SUCCESS' par défaut
  const rawStatus =
    txData.transaction_status ||
    payload.transaction_status ||
    txData.status ||
    payload.status;

  if (!rawStatus) {
    console.error('[SECURITY REJECT C2] Webhook reçu sans statut explicite. Rejet immédiat.');
    const err = new Error('MISSING_WEBHOOK_STATUS');
    err.code = 'MISSING_WEBHOOK_STATUS';
    throw err;
  }

  const status = String(rawStatus).trim().toUpperCase();

  const amount = Number(txData.amount || payload.amount || txData.price || 0);
  const chargedAmount = Number(txData.charged || payload.charged || txData.amount || amount);
  const netAmount = Number(txData.net_amount || payload.net_amount || txData.amount || amount);
  const currency = txData.currency || payload.currency || 'XOF';
  const customerPhone = String(txData.customer_phone || txData.client_phone || txData.phone || payload.customer_phone || '').trim();
  const operator = txData.operator || payload.operator || txData.network || payload.network || 'MOBILE_MONEY';
  const resolvedProvider = String(
    txData.provider ||
    payload.provider ||
    (payload.event ? 'SASPAY' : (txData.network ? 'SASPAY' : (String(operator).includes('_') ? 'SASPAY' : 'SEBPAY')))
  ).toUpperCase();
  const paymentRef = txData.paymentRef || txData.payment_reference || externalRef || transactionId || `ref_${Date.now()}`;

  // Résolution multi-tenant "${tenant_id}___${order_id}" ou via metadata
  let resolvedTenantId = txData.metadata?.storeId || payload.metadata?.storeId || 'nanasore_central_hub';
  let resolvedOrderId = txData.metadata?.orderId || payload.metadata?.orderId || externalRef || transactionId || `ORD_${Date.now()}`;
  if (externalRef && externalRef.includes('___')) {
    const parts = externalRef.split('___');
    resolvedTenantId = parts[0] || resolvedTenantId;
    resolvedOrderId = parts[1] || resolvedOrderId;
  }

  console.log(`[PAYMENT WEBHOOK PROCESSING] Provider: ${resolvedProvider} | Transaction: ${transactionId} | Order: ${resolvedOrderId} | Tenant: ${resolvedTenantId} | Status: ${status} | Montant: ${amount}`);

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  // Enregistrement dans l'inbox webhooks avant traitement (Audit M2)
  const { inboxId, duplicate } = await recordWebhookToInbox(supabase, {
    gateway: options.gateway || resolvedProvider,
    transactionId,
    orderId: resolvedOrderId,
    signature: options.signature,
    payload
  });

  if (duplicate) {
    console.log(`[IDEMPOTENCE GUARD] Webhook ${resolvedProvider}/${transactionId} déjà traité.`);
    return { success: true, alreadyProcessed: true };
  }

  const isSuccessSupabase = ["APPROVED", "SUCCESS", "COMPLETED", "PAID", "VALIDATED", "CONFIRMED", "ACCEPTED"].includes(status);

  if (isSuccessSupabase) {
    try {
      const nowIso = new Date().toISOString();

      // Audit C1, C4, M5 : Vérification stricte de la commande en base (montant, statut, tenant)
      const { data: orderRow } = await supabase
        .from("orders")
        .select("id, total_amount, status, payment_status, tenant_id, metadata")
        .eq("id", String(resolvedOrderId))
        .maybeSingle();

      const { data: saleRow } = !orderRow ? await supabase
        .from("sales")
        .select("id, total_amount, payment_status, organization_id, metadata")
        .eq("id", String(resolvedOrderId))
        .maybeSingle() : { data: null };

      const dbRecord = orderRow || saleRow;
      if (dbRecord) {
        const expectedAmount = Number(dbRecord.total_amount || 0);
        const existingTxId = dbRecord.metadata?.transaction_id;
        const alreadyPaid =
          String(dbRecord.payment_status || "").toLowerCase() === "paid" ||
          ["paid", "completed"].includes(String(dbRecord.status || "").toLowerCase());

        if (alreadyPaid) {
          if (transactionId && existingTxId === transactionId) {
            if (inboxId) {
              await supabase.from("payment_webhook_inbox").update({ status: "processed", processed_at: nowIso }).eq("id", inboxId);
            }
            return { success: true, alreadyProcessed: true, orderId: resolvedOrderId };
          }
          const dupErr = new Error(`ORDER_ALREADY_PAID: Commande #${resolvedOrderId} déjà payée`);
          dupErr.code = "ORDER_ALREADY_PAID";
          throw dupErr;
        }

        if (expectedAmount > 0 && amount < expectedAmount) {
          await supabase.from("payment_logs").insert({
            tenant_id: orderRow?.tenant_id || saleRow?.organization_id || resolvedTenantId,
            transaction_id: transactionId || null,
            amount,
            status: "UNDERPAID_REJECTED",
            raw_payload: { order_id: resolvedOrderId, expected: expectedAmount, received: amount, gateway: resolvedProvider },
            created_at: nowIso
          });
          const amtErr = new Error(`AMOUNT_MISMATCH: Reçu ${amount}, attendu ${expectedAmount}`);
          amtErr.code = "AMOUNT_MISMATCH";
          throw amtErr;
        }

        // Audit M5 : le tenant réel vient de la base
        if (orderRow?.tenant_id) resolvedTenantId = String(orderRow.tenant_id);
        if (saleRow?.organization_id) resolvedTenantId = String(saleRow.organization_id);
      }

      if (orderRow) {
        const { error: orderErr } = await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            status: "paid",
            metadata: { ...(orderRow.metadata || {}), transaction_id: transactionId, amount_paid: amount, paid_at: nowIso },
            updated_at: nowIso
          })
          .eq("id", resolvedOrderId);
        if (orderErr) throw new Error(`ORDERS_UPDATE_FAILED: ${orderErr.message}`);
      }

      if (saleRow) {
        const { error: saleErr } = await supabase
          .from("sales")
          .update({
            payment_status: "paid",
            metadata: { ...(saleRow.metadata || {}), transaction_id: transactionId, amount_paid: amount, paid_at: nowIso },
            updated_at: nowIso
          })
          .eq("id", resolvedOrderId);
        if (saleErr) throw new Error(`SALES_UPDATE_FAILED: ${saleErr.message}`);
      }

      await supabase.from("payment_logs").insert({
        tenant_id: resolvedTenantId,
        transaction_id: transactionId || null,
        amount: Number(amount) || 0,
        status,
        customer_phone: customerPhone || null,
        raw_payload: payload,
        created_at: nowIso
      });

      await switchManager.dispatchPostPaymentWorkflow({
        db: null,
        orderId: resolvedOrderId,
        storeId: resolvedTenantId,
        totalAmount: Number(amount),
        transactionId: transactionId || `tx_${Date.now()}`,
        gateway: String(resolvedProvider || "saspay").toLowerCase(),
        currency,
        customerPhone,
        customerEmail: txData.client_email || txData.email || payload.client_email || "",
        customerName: txData.client_name || txData.name || "Client Wameet",
        productTitle: txData.description || payload.description || "Commande Nanasore",
        storeName: resolvedTenantId
      });

      if (String(resolvedOrderId).startsWith("ESC_") || String(resolvedOrderId).startsWith("TX_ESC_") || externalRef.startsWith("escrow___")) {
        const escrowTxId = externalRef.startsWith("escrow___") ? externalRef.replace(/^escrow___/, "") : String(resolvedOrderId);
        const { data: escrowData } = await supabase.from("escrow_transactions").select("*").eq("id", escrowTxId).maybeSingle();
        if (escrowData && amount >= Number(escrowData.amount || 0)) {
          await supabase
            .from("escrow_transactions")
            .update({ status: "locked", escrow_status: "locked", is_paid: true, operator, transaction_id: transactionId || escrowTxId, locked_at: nowIso, updated_at: nowIso })
            .eq("id", escrowTxId)
            .eq("status", "pending");
          if (escrowData.chat_id) {
            broadcastToChat(escrowData.chat_id, "transaction_updated", {
              transactionId: escrowTxId,
              messageId: escrowData.message_id,
              chatId: escrowData.chat_id,
              status: "locked",
              escrowStatus: "locked",
              updatedAt: nowIso
            });
          }
        }
      }

      if (inboxId) {
        await supabase.from("payment_webhook_inbox").update({ status: "processed", processed_at: nowIso }).eq("id", inboxId);
      }

      broadcastPaymentEvent({
        type: "PAYMENT_CONFIRMED",
        orderId: resolvedOrderId,
        transactionId,
        storeId: resolvedTenantId,
        amount,
        currency,
        status: "PAID"
      });

      console.log(`[SUPABASE WEBHOOK SUCCESS] Transaction ${transactionId} / Commande ${resolvedOrderId} validée et splittée atomiquement.`);
      return { success: true, orderId: resolvedOrderId, tenantId: resolvedTenantId };
    } catch (supaErr) {
      console.error("[SUPABASE WEBHOOK ERROR]", supaErr.message);
      if (inboxId) {
        await supabase.from("payment_webhook_inbox").update({ status: "failed", error_message: supaErr.message, retry_count: 1 }).eq("id", inboxId);
      }
      throw supaErr;
    }
  } else {
    const { data: existingTx } = await supabase.from("nanaswitch_transactions").select("status").eq("order_id", resolvedOrderId).maybeSingle();
    if (!existingTx || !["PAID", "COMPLETED"].includes(String(existingTx.status || "").toUpperCase())) {
      await supabase
        .from("nanaswitch_transactions")
        .upsert({
          order_id: resolvedOrderId,
          store_id: resolvedTenantId,
          transaction_id: transactionId || null,
          amount: Number(amount) || 0,
          currency,
          gateway: String(resolvedProvider || "saspay").toLowerCase(),
          status: status || "FAILED",
          updated_at: new Date().toISOString()
        }, { onConflict: "order_id" })
        .catch(err => console.warn("[SUPABASE WEBHOOK FAILED LOG]", err.message));
    }
    if (inboxId) {
      await supabase.from("payment_webhook_inbox").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", inboxId);
    }
    return { success: false, status, orderId: resolvedOrderId };
  }
}

// ============================================================================
// ROUTE 3b : Vérification de Transaction (Polling & Validation instantanée)
// ============================================================================
app.get(['/api/payment/verify/:txId', '/api/payment/status/:txId'], async (req, res) => {
  try {
    const { txId } = req.params;
    if (!txId) {
      return res.status(400).json({ error: 'Identifiant de transaction (txId) requis.' });
    }

    if (db) {
      // 1. Recherche dans transactions
      const txDoc = await db.collection('transactions').doc(txId).get();
      if (txDoc.exists) {
        const data = txDoc.data();
        const isDone = ['completed', 'success', 'paid', 'validated'].includes(String(data.status || '').toLowerCase());
        if (isDone) {
          return res.json({
            success: true,
            status: data.status,
            txId,
            data
          });
        }
      }

      // 2. Recherche dans payment_intents
      const intentDoc = await db.collection('payment_intents').doc(txId).get();
      if (intentDoc.exists) {
        const data = intentDoc.data();
        const isDone = ['COMPLETED', 'SUCCESS', 'VALIDATED', 'PAID'].includes(String(data.status || '').toUpperCase()) ||
          ['COMPLETED', 'PAID'].includes(String(data.paymentStatus || '').toUpperCase()) ||
          data.isPaid === true;
        if (isDone) {
          return res.json({
            success: true,
            status: data.status || 'COMPLETED',
            txId,
            data
          });
        }
      }
    }

    // 3. Fallback direct vers Sebpay si configuré
    if (process.env.SEBPAY_PUBLIC_KEY && process.env.SEBPAY_SECRET_KEY) {
      try {
        const sebpayStatus = await getSebpayCollection(txId);
        if (sebpayStatus.isPaid) {
          if (db) {
            const nowServer = admin.firestore.FieldValue.serverTimestamp();
            const parts = txId.split('___');
            const resolvedOrderId = parts.length > 1 ? parts[1] : txId;
            const updatePayload = {
              status: 'COMPLETED',
              paymentStatus: 'PAID',
              isPaid: true,
              paid: true,
              validatedAt: nowServer,
              updatedAt: nowServer
            };
            await db.collection('payment_intents').doc(resolvedOrderId).set(updatePayload, { merge: true });
            await db.collection('payment_intents').doc(txId).set(updatePayload, { merge: true });
          }
          return res.json({
            success: true,
            status: 'COMPLETED',
            txId,
            data: sebpayStatus.data,
            message: 'Paiement validé avec succès par Sebpay.'
          });
        }
      } catch (sebpayErr) {
        // En attente ou erreur non bloquante
      }
    }

    return res.json({
      success: false,
      status: 'PENDING',
      txId,
      message: 'Transaction en cours de traitement bancaire.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur vérification transaction', details: err.message });
  }
});

// ============================================================================
// ROUTE 3b-2 : Vérification de Session Hébergée Sebpay (Hosted Checkout Return)
// Appelé au retour client sur /checkout/return?checkout_session_id=...
// Interroge GET /api/v1/checkout/sessions/{id} et valide Firestore UNIQUEMENT si approved
// ============================================================================
app.get(['/api/payment/verify-session', '/api/payments/verify-session', '/api/payment/checkout/verify-session'], async (req, res) => {
  try {
    const sessionId = req.query.checkout_session_id || req.query.session_id || req.query.id || req.query.checkoutSessionId;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Identifiant checkout_session_id obligatoire en paramètre d\'URL.'
      });
    }

    console.log(`[VERIFY SESSION] Interrogation Sebpay pour la session : "${sessionId}"`);
    const sessionRes = await getSebpayCheckoutSession(sessionId);

    const transactionStatus = String(sessionRes.transaction_status || 'pending').toLowerCase();
    const isApproved = transactionStatus === 'approved';

    const rawOrder = sessionRes.orderId || (sessionRes.external_reference && sessionRes.external_reference.includes('___') ? sessionRes.external_reference.split('___')[1] : sessionRes.external_reference);
    const orderId = rawOrder || sessionId;
    const storeId = sessionRes.storeId || (sessionRes.external_reference && sessionRes.external_reference.includes('___') ? sessionRes.external_reference.split('___')[0] : 'nanasore_central_hub');

    console.log(`[VERIFY SESSION RESULT] Session: ${sessionId} | Statut: ${transactionStatus} | Approved: ${isApproved} | Commande: ${orderId}`);

    // RÈGLE STRICTE : Valider la commande dans Firestore ("PAID") UNIQUEMENT si transaction_status === "approved"
    if (isApproved && db && orderId) {
      try {
        const nowServer = admin.firestore.FieldValue.serverTimestamp();
        const batch = db.batch();

        const updatePayload = {
          status: 'PAID',
          paymentStatus: 'PAID',
          isPaid: true,
          gateway: 'sebpay',
          provider: 'SEBPAY_HOSTED_CHECKOUT',
          checkoutSessionId: sessionId,
          transactionId: sessionId,
          paidAt: nowServer,
          updatedAt: nowServer,
          amount: sessionRes.amount,
          currency: sessionRes.currency || 'XOF'
        };

        // 1. payment_intents
        const intentRef = db.collection('payment_intents').doc(orderId);
        batch.set(intentRef, updatePayload, { merge: true });

        // 2. orders
        const orderRef = db.collection('orders').doc(orderId);
        batch.set(orderRef, {
          status: 'PAID',
          paymentStatus: 'PAID',
          isPaid: true,
          deliveryStatus: 'PENDING_DISPATCH', // Déclenchement de la livraison
          paidAt: nowServer,
          updatedAt: nowServer
        }, { merge: true });

        // 3. customer_orders
        const custOrderRef = db.collection('customer_orders').doc(orderId);
        batch.set(custOrderRef, {
          status: 'PAID',
          paymentStatus: 'PAID',
          isPaid: true,
          deliveryStatus: 'PENDING_DISPATCH',
          paidAt: nowServer,
          updatedAt: nowServer
        }, { merge: true });

        // 4. processed_transactions (protection idempotence)
        const processedRef = db.collection('processed_transactions').doc(sessionId);
        batch.set(processedRef, {
          transactionId: sessionId,
          orderId,
          storeId,
          status: 'PAID',
          processed: true,
          gateway: 'sebpay',
          amount: sessionRes.amount,
          currency: sessionRes.currency,
          createdAt: nowServer
        }, { merge: true });

        await batch.commit();
        console.log(`[VERIFY SESSION FIRESTORE] Commande #${orderId} validée en "PAID" et livraison déclenchée avec succès.`);
      } catch (dbErr) {
        console.error('[VERIFY SESSION FIRESTORE ERROR]', dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      transaction_status: transactionStatus,
      isPaid: isApproved,
      isApproved,
      orderId,
      storeId,
      amount: sessionRes.amount,
      currency: sessionRes.currency,
      session: sessionRes.data,
      message: isApproved
        ? 'Paiement confirmé avec succès par Sebpay.'
        : `Statut de transaction : ${transactionStatus}`
    });

  } catch (err) {
    console.error('[VERIFY SESSION ERROR]', err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
      transaction_status: 'error',
      isPaid: false
    });
  }
});

// ============================================================================
// ROUTE 3c : Initiation Paiement Sebpay (POST /collections)
// ============================================================================
app.post(['/api/payment/sebpay/collections', '/api/payment/sebpay/initiate'], async (req, res) => {
  try {
    const {
      tenantId = req.body.storeId || 'nanasore_central_hub',
      orderId = req.body.orderId || `ORD_${Date.now()}`,
      amount,
      currency = 'XOF',
      customerPhone = req.body.phone,
      phone,
      customerName,
      customerEmail,
      operator = req.body.provider || req.body.operator_code || req.body.slug,
      otpCode = req.body.otpCode || req.body.otp || req.body.otp_code || req.body.authorization_code,
      description
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Montant de paiement invalide.' });
    }

    // Nettoyage standardisé du nom de la boutique pour qu'il soit propre dans l'external_reference
    const rawShopName = req.body.shopName || req.body.storeName || tenantId || 'boutique';
    const cleanShopName = String(rawShopName)
      .toLowerCase()
      .replace(/^nanasore_/, '')
      .replace(/[^a-z0-9]/g, '_') // Remplace les espaces et caractères spéciaux par des underscores
      .replace(/_+/g, '_')          // Évite les underscores multiples
      .replace(/^_|_$/g, '') || 'boutique';

    // Génération de la référence unique avec le vrai nom de la boutique
    const externalReference = req.body.externalReference || req.body.external_reference || `nanasore_${cleanShopName}___${orderId}`;

    const callbackUrl =
      req.body.callback_url ||
      req.body.callbackUrl ||
      process.env.PAYMENT_CALLBACK_URL ||
      process.env.PAYMENT_WEBHOOK_URL ||
      'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run/api/payment/webhook';

    const requestedGateway = req.body.gateway || req.query.gateway || switchManager.getPrimaryGateway();
    const autoFailover = req.query.failover !== 'false' && req.body.failover !== false;
    let sebpayResult;

    if (autoFailover) {
      sebpayResult = await switchManager.initiatePaymentWithFailover(requestedGateway, {
        orderId,
        storeId: tenantId,
        tenantId,
        shopName: rawShopName,
        storeName: rawShopName,
        externalReference,
        amount,
        currency,
        country: req.body.country || req.body.country_code || req.body.countryCode,
        phone: phone || customerPhone,
        customerPhone: phone || customerPhone,
        customer_phone: phone || customerPhone,
        customerName,
        customerEmail,
        operator,
        otpCode,
        description,
        callbackUrl,
        returnUrl: req.body.returnUrl || req.body.return_url || req.body.redirectUrl || req.body.redirect_url || 'https://nanasore.com/checkout/return',
        redirectUrl: req.body.returnUrl || req.body.return_url || req.body.redirectUrl || req.body.redirect_url || 'https://nanasore.com/checkout/return'
      }, { db });
    } else {
      sebpayResult = await switchManager.getAdapter(requestedGateway).initiatePayment({
        orderId,
        storeId: tenantId,
        tenantId,
        shopName: rawShopName,
        storeName: rawShopName,
        externalReference,
        amount,
        currency,
        country: req.body.country || req.body.country_code || req.body.countryCode,
        phone: phone || customerPhone,
        customerPhone: phone || customerPhone,
        customer_phone: phone || customerPhone,
        customerName,
        customerEmail,
        operator,
        otpCode,
        description,
        callbackUrl,
        returnUrl: req.body.returnUrl || req.body.return_url || req.body.redirectUrl || req.body.redirect_url || 'https://nanasore.com/checkout/return',
        redirectUrl: req.body.returnUrl || req.body.return_url || req.body.redirectUrl || req.body.redirect_url || 'https://nanasore.com/checkout/return'
      });
    }

    const resolvedGateway = sebpayResult.gateway || 'sebpay';

    // Enregistre l'intention dans Firestore si disponible
    if (db) {
      try {
        const nowServer = admin.firestore.FieldValue.serverTimestamp();
        const intentData = {
          id: orderId,
          orderId,
          tenantId,
          externalReference,
          amount: Number(amount),
          currency,
          customerPhone: phone || customerPhone,
          operator: operator || resolvedGateway.toUpperCase(),
          provider: resolvedGateway.toUpperCase(),
          gateway: resolvedGateway,
          transactionId: sebpayResult.transactionId || sebpayResult.id || null,
          failedOver: Boolean(sebpayResult.failedOver),
          originalGateway: sebpayResult.originalGateway || null,
          failoverReason: sebpayResult.failoverReason || null,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          environment: 'production',
          isTest: false,
          providerLink: sebpayResult.paymentUrl || sebpayResult.provider_link || null,
          redirectUrl: sebpayResult.paymentUrl || sebpayResult.provider_link || null,
          action: sebpayResult.action || 'redirect',
          createdAt: nowServer,
          updatedAt: nowServer
        };

        await db.collection('payment_intents').doc(orderId).set(intentData, { merge: true });
        await db.collection('payment_intents').doc(externalReference).set(intentData, { merge: true });
      } catch (fbErr) {
        console.warn('[FIRESTORE INTENT] Enregistrement intention :', fbErr.message);
      }
    }

    return res.status(200).json(sebpayResult);

  } catch (err) {
    console.error('[SEBPAY INITIATE ERROR]', err.message);
    const statusCode = err.status || (err.code === 'OTP_REQUIRED' || err.code === 'INVALID_PHONE_NUMBER' ? 400 : 500);
    return res.status(statusCode).json({
      success: false,
      code: err.code || (statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'),
      error: err.message,
      message: err.message,
      operator: err.operator || null,
      ussd_code: err.ussd_code || null,
      details: err.data || null
    });
  }
});

// ============================================================================
// PROTECTION ANTI-SPAM FIXIE : Rate Limiting & Backoff Exponentiel (Max 3 essais)
// ============================================================================
// Empêche impérativement la saturation du quota Fixie / Render.
// Backoff : Essai 1 -> immédiat | Essai 2 -> min 5s | Essai 3 -> min 15s | Au-delà -> BLOCAGE (Webhook uniquement).
const fixieThrottleMap = new Map();

function getFixieThrottleStatus(refKey) {
  const now = Date.now();
  const entry = fixieThrottleMap.get(refKey) || { attempts: 0, lastAttemptTime: 0 };
  
  if (entry.attempts >= 3) {
    return { allowed: false, reason: 'MAX_ATTEMPTS_REACHED', attempts: entry.attempts };
  }

  const requiredDelays = [0, 5000, 15000]; // 0s, 5s, 15s
  const requiredDelay = requiredDelays[entry.attempts] || 30000;
  const elapsed = now - entry.lastAttemptTime;

  if (entry.lastAttemptTime > 0 && elapsed < requiredDelay) {
    return { allowed: false, reason: 'BACKOFF_THROTTLED', waitMs: requiredDelay - elapsed, attempts: entry.attempts };
  }

  return { allowed: true, attempts: entry.attempts };
}

function recordFixieAttempt(refKey) {
  const entry = fixieThrottleMap.get(refKey) || { attempts: 0, lastAttemptTime: 0 };
  entry.attempts += 1;
  entry.lastAttemptTime = Date.now();
  fixieThrottleMap.set(refKey, entry);

  // Nettoyage automatique du cache mémoire après 30 minutes
  setTimeout(() => fixieThrottleMap.delete(refKey), 30 * 60 * 1000).unref?.();
}

// ============================================================================
// ROUTE 3d : Vérification Secours (GET /collections/{external_reference})
// ============================================================================
app.get(['/api/payment/sebpay/collections/:externalRef', '/api/payment/sebpay/verify/:externalRef'], async (req, res) => {
  try {
    const { externalRef } = req.params;
    if (!externalRef) {
      return res.status(400).json({ error: 'external_reference requis.' });
    }

    const parts = externalRef.split('___');
    const orderId = parts.length > 1 ? parts[1] : externalRef;
    const primaryGateway = switchManager.getPrimaryGateway();

    // 1. VÉRIFICATION PRIORITAIRE DANS FIRESTORE (0% appel réseau, 0% Fixie)
    let iData = null;
    if (db) {
      try {
        let intentDoc = await db.collection('payment_intents').doc(orderId).get();
        if (!intentDoc.exists && externalRef !== orderId) {
          intentDoc = await db.collection('payment_intents').doc(externalRef).get();
        }
        if (intentDoc.exists) {
          iData = intentDoc.data();
          const isServerValidated = Boolean(iData?.validatedByWebhook === true || iData?.validatedAt);
          const isPaid = isServerValidated && (iData?.isPaid === true || iData?.paid === true || ['PAID', 'COMPLETED', 'SUCCESS'].includes(String(iData?.status || '').toUpperCase()));
          if (isPaid) {
            return res.json({
              success: true,
              isPaid: true,
              status: 'PAID',
              orderId,
              transaction_id: iData.transactionId || externalRef,
              amount: iData.amountPaid || iData.amount,
              currency: iData.currency || 'XOF',
              gateway: iData.gateway || primaryGateway,
              message: 'Paiement confirmé avec succès.'
            });
          }
        }
      } catch (fbErr) {
        console.warn('[INTENT FIRESTORE VERIFY NOTICE]', fbErr.message);
      }
    }

    // 2. DÉTERMINATION STRICTE DE LA PASSERELLE EXÉCUTÉE (intent.gateway)
    const executedGateway = (iData?.gateway || (iData?.provider ? iData.provider.toLowerCase() : null) || primaryGateway).toLowerCase();

    // 3. FLUX SASPAY : APPEL DIRECT SANS PROXY FIXIE
    if (executedGateway === 'saspay') {
      const sasTxId = iData?.transactionId || iData?.id || externalRef;
      try {
        const sasVerify = await verifySaspayPayment(sasTxId);
        if (sasVerify.isPaid && db) {
          const nowServer = admin.firestore.FieldValue.serverTimestamp();
          const updatePayload = {
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            isPaid: true,
            paid: true,
            validatedByWebhook: true,
            amountPaid: sasVerify.amount || iData?.amount,
            validatedAt: nowServer,
            updatedAt: nowServer
          };
          await db.collection('payment_intents').doc(orderId).set(updatePayload, { merge: true });
          if (externalRef !== orderId) {
            await db.collection('payment_intents').doc(externalRef).set(updatePayload, { merge: true });
          }
        }

        return res.json({
          success: sasVerify.isPaid,
          isPaid: sasVerify.isPaid,
          status: sasVerify.isPaid ? 'PAID' : (sasVerify.status || 'PENDING'),
          orderId,
          transaction_id: sasTxId,
          amount: sasVerify.amount || iData?.amount,
          currency: sasVerify.currency || iData?.currency || 'XOF',
          gateway: 'saspay',
          message: sasVerify.isPaid ? 'Paiement validé par SasPay' : 'En attente de validation opérateur.'
        });
      } catch (sasErr) {
        return res.json({
          success: false,
          isPaid: false,
          status: 'PENDING',
          orderId,
          externalRef,
          gateway: 'saspay',
          message: 'Transaction en cours de traitement sur votre téléphone.'
        });
      }
    }

    // 4. FLUX SEBPAY : PROTÉGÉ STRICTEMENT PAR LE COUPE-CIRCUIT ANTI-SPAM FIXIE
    const sebpayTxId = iData?.transactionId || iData?.provider_reference || iData?.transaction_id || iData?.txId;
    const isInternalOrderRef = !sebpayTxId || String(sebpayTxId).startsWith('CHK-') || String(sebpayTxId).includes('___');

    // Si nous n'avons pas d'ID numérique officiel Sebpay, ne pas interroger Sebpay pour éviter le 404
    if (isInternalOrderRef) {
      return res.json({
        success: false,
        isPaid: false,
        status: 'PENDING',
        orderId,
        externalRef,
        gateway: 'sebpay',
        message: 'Transaction en cours d\'autorisation auprès de l\'opérateur.'
      });
    }

    // Vérification de la politique anti-spam Fixie (Backoff + max 3 requêtes)
    const throttleStatus = getFixieThrottleStatus(orderId);
    if (!throttleStatus.allowed) {
      console.log(`[FIXIE GUARD] Requête de vérification pour #${orderId} bridée (Raison: ${throttleStatus.reason}, Essais: ${throttleStatus.attempts}/3). Préservation du tunnel Fixie active.`);
      return res.json({
        success: false,
        isPaid: false,
        status: 'PENDING',
        orderId,
        externalRef,
        gateway: 'sebpay',
        message: 'Transaction en cours de validation (écoute Webhook active).'
      });
    }

    // Enregistrement de l'essai autorisé vers Sebpay via Fixie
    recordFixieAttempt(orderId);
    console.log(`[FIXIE GUARD] Appel Sebpay autorisé pour #${orderId} (Essai ${throttleStatus.attempts + 1}/3 via Fixie)...`);

    try {
      const sebData = await getSebpayCollection(sebpayTxId);
      if (sebData.isPaid && db) {
        const nowServer = admin.firestore.FieldValue.serverTimestamp();
        const updatePayload = {
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          isPaid: true,
          paid: true,
          validatedAt: nowServer,
          updatedAt: nowServer
        };
        await db.collection('payment_intents').doc(orderId).set(updatePayload, { merge: true });
        if (externalRef !== orderId) {
          await db.collection('payment_intents').doc(externalRef).set(updatePayload, { merge: true });
        }
      }

      return res.json({
        success: sebData.isPaid,
        isPaid: sebData.isPaid,
        status: sebData.isPaid ? 'PAID' : (sebData.status || 'PENDING'),
        orderId,
        transaction_id: sebpayTxId,
        amount: sebData.amount || iData?.amount,
        currency: sebData.currency || iData?.currency || 'XOF',
        gateway: 'sebpay',
        message: sebData.isPaid ? 'Paiement validé par Sebpay' : 'En attente de validation opérateur.'
      });
    } catch (sebErr) {
      return res.json({
        success: false,
        isPaid: false,
        status: 'PENDING',
        orderId,
        externalRef,
        gateway: 'sebpay',
        message: 'En attente de validation opérateur.'
      });
    }
  } catch (err) {
    console.error('[UNIVERSAL VERIFY ERROR]', err);
    return res.status(200).json({
      success: false,
      isPaid: false,
      status: 'PENDING',
      error: err.message,
      message: 'En cours de validation opérateur'
    });
  }
});

// ============================================================================
// ROUTE 3e : Catalogue Sécurisé des 20 Pays Couverts (GET /api/payment/countries)
// Sécurité : Clés X-Secret-Key & X-Public-Key strictement confinées au serveur Render
// Performance : Mise en cache serveur 1h pour alléger le réseau
// ============================================================================
app.get(['/api/payment/countries', '/api/payment/sebpay/countries'], async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const result = await getSebpayCountries(forceRefresh);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[COUNTRIES API ERROR]', err);
    return res.status(200).json({
      success: true,
      cached: true,
      fallback: true,
      count: SEBPAY_SUPPORTED_COUNTRIES_FALLBACK.length,
      countries: SEBPAY_SUPPORTED_COUNTRIES_FALLBACK,
      warning: err.message
    });
  }
});

// ============================================================================
// ROUTE 3f : Catalogue des Opérateurs par Pays (GET /api/payment/sebpay/operators?country=BF)
// ============================================================================
app.get(['/api/payment/operators', '/api/payment/sebpay/operators'], async (req, res) => {
  try {
    const country = req.query.country || req.query.country_code || req.query.countryCode || 'BF';
    const result = await getSebpayOperators(country);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[OPERATORS API ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ROUTE 3g : Calcul des Frais Sebpay en temps réel (GET /api/payment/sebpay/fees)
// ============================================================================
app.get(['/api/payment/sebpay/fees', '/api/payment/sebpay/calculate-fee'], async (req, res) => {
  try {
    const amount = Number(req.query.amount || req.query.montant || 0);
    const country = req.query.country || req.query.country_code || req.query.countryCode || req.query.source_country || 'BF';
    const transactionType = req.query.transaction_type || req.query.type || 'collection';

    const result = await calculateSebpayFee({ amount, country, transactionType });
    return res.status(200).json(result);
  } catch (err) {
    console.error('[SEBPAY FEES API ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ROUTE SASPAY 1 : Encaissement (Pay-In / Collections) - DIRECT SANS FIXIE
// ============================================================================
app.post(['/api/payment/saspay/payin', '/api/payment/saspay/initiate'], async (req, res) => {
  try {
    const {
      amount,
      currency = 'XOF',
      country = 'BF',
      phone,
      customerPhone,
      customerName,
      operator,
      network,
      description,
      tenantId = 'nanasore_central_hub',
      orderId = `ORD_${Date.now()}`,
      returnUrl,
      type = 'auto'
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Montant de paiement invalide.' });
    }

    // Nettoyage standardisé du nom de la boutique pour qu'il soit propre dans l'external_reference
    const rawShopName = req.body.shopName || req.body.storeName || tenantId || 'boutique';
    const cleanShopName = String(rawShopName)
      .toLowerCase()
      .replace(/^nanasore_/, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'boutique';

    const externalReference = req.body.externalReference || req.body.external_reference || `nanasore_${cleanShopName}___${orderId}`;
    const callbackUrl =
      req.body.callback_url ||
      req.body.callbackUrl ||
      process.env.PAYMENT_CALLBACK_URL ||
      'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run/api/payment/saspay/webhook';

    const saspayResult = await createSaspayPayin({
      tenantId,
      orderId,
      externalReference,
      amount,
      currency,
      country,
      phone: phone || customerPhone,
      customerName,
      operator,
      network,
      description,
      callbackUrl,
      returnUrl,
      type
    });

    if (db) {
      try {
        const nowServer = admin.firestore.FieldValue.serverTimestamp();
        const intentData = {
          id: orderId,
          orderId,
          tenantId,
          externalReference,
          amount: Number(amount),
          currency,
          customerPhone: phone || customerPhone,
          operator: operator || network || 'SASPAY',
          provider: 'SASPAY',
          gateway: 'saspay',
          status: 'PENDING',
          paymentStatus: 'PENDING',
          environment: 'production',
          redirectUrl: saspayResult.checkout_url || null,
          action: saspayResult.action,
          createdAt: nowServer,
          updatedAt: nowServer
        };
        await db.collection('payment_intents').doc(orderId).set(intentData, { merge: true });
        await db.collection('payment_intents').doc(externalReference).set(intentData, { merge: true });
      } catch (fbErr) {
        console.warn('[FIRESTORE SASPAY INTENT]', fbErr.message);
      }
    }

    return res.status(200).json(saspayResult);
  } catch (err) {
    console.error('[SASPAY PAYIN ERROR]', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      details: err.data || null
    });
  }
});

// ============================================================================
// ROUTE SASPAY 2 : Décaissement (Pay-Out / Transfers) - VIA PROXY FIXIE (FIXIE_URL_SASPAY)
// ============================================================================
app.post('/api/payment/saspay/payout', requireInternalAdminAuth, async (req, res) => {
  try {
    const {
      amount,
      currency = 'XOF',
      country = 'BF',
      phone,
      beneficiaryPhone,
      beneficiaryName,
      operator,
      network,
      description,
      tenantId = 'nanasore_central_hub',
      payoutId = `POUT_${Date.now()}`
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Montant de transfert invalide.' });
    }

    const callbackUrl =
      req.body.callback_url ||
      req.body.callbackUrl ||
      process.env.PAYMENT_CALLBACK_URL ||
      'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run/api/payment/saspay/webhook';

    const payoutResult = await createSaspayPayout({
      tenantId,
      payoutId,
      amount,
      currency,
      country,
      phone: phone || beneficiaryPhone,
      beneficiaryName,
      operator,
      network,
      description,
      callbackUrl
    });

    if (db) {
      try {
        const nowServer = admin.firestore.FieldValue.serverTimestamp();
        await db.collection('payouts').doc(payoutId).set({
          id: payoutId,
          tenantId,
          amount: Number(amount),
          currency,
          phone: phone || beneficiaryPhone,
          provider: 'SASPAY',
          status: payoutResult.status || 'PENDING',
          createdAt: nowServer,
          updatedAt: nowServer
        }, { merge: true });
      } catch (fbErr) {
        console.warn('[FIRESTORE SASPAY PAYOUT]', fbErr.message);
      }
    }

    return res.status(200).json(payoutResult);
  } catch (err) {
    console.error('[SASPAY PAYOUT ERROR]', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      details: err.data || null
    });
  }
});

// ============================================================================
// ROUTE SASPAY 3 : Vérification Encaissement / Décaissement
// ============================================================================
app.get('/api/payment/saspay/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isPayout = req.query.type === 'payout' || id.startsWith('POUT_');
    const result = isPayout ? await verifySaspayPayout(id) : await verifySaspayPayment(id);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[SASPAY VERIFY ERROR]', err);
    return res.status(500).json({ success: false, error: err.message, details: err.data || null });
  }
});

// ============================================================================
// ROUTE SASPAY 4 : Catalogue des 24 pays Saspay
// ============================================================================
app.get('/api/payment/saspay/countries', (req, res) => {
  return res.json({
    success: true,
    count: Object.keys(SASPAY_SUPPORTED_COUNTRIES).length,
    countries: SASPAY_SUPPORTED_COUNTRIES
  });
});

// ============================================================================
// ROUTE SASPAY 5 : Webhook Sécurisé SasPay (Signature HMAC-SHA256 & Timestamp 300s)
// ============================================================================
app.post(
  [
    '/webhook/saspay',
    '/api/webhook/saspay',
    '/api/payment/saspay/webhook',
    '/api/webhooks/saspay'
  ],
  express.raw({ type: 'application/json', limit: '5mb' }),
  async (req, res) => {
    try {
      const signature =
        req.headers['x-saspay-signature'] ||
        req.headers['X-Saspay-Signature'] ||
        req.headers['x-webhook-signature'] ||
        req.headers['X-Webhook-Signature'];

      const timestamp =
        req.headers['x-webhook-timestamp'] ||
        req.headers['X-Webhook-Timestamp'] ||
        req.headers['x-saspay-timestamp'];

      const eventName = req.headers['x-webhook-event'] || req.headers['X-Webhook-Event'];

      const rawBuffer = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})), 'utf8');

      // Vérification cryptographique stricte avec SASPAY_WEBHOOK_SECRET / SASPAY_API_KEY
      const candidateSasSecrets = [process.env.SASPAY_WEBHOOK_SECRET, process.env.SASPAY_API_KEY, process.env.PAYMENT_WEBHOOK_SECRET].filter(Boolean);
      if (candidateSasSecrets.length === 0) {
        console.error('[SASPAY WEBHOOK REJECT] Variable SASPAY_WEBHOOK_SECRET non configurée sur le serveur.');
        return res.status(500).json({ error: 'Configuration serveur incomplète (SASPAY_WEBHOOK_SECRET manquant).' });
      }

      let sigCheck = { valid: false, reason: 'missing_secret' };
      for (const sasSecret of candidateSasSecrets) {
        sigCheck = verifySaspayWebhookSignature({
          rawBody: rawBuffer,
          signature,
          timestamp,
          secret: sasSecret
        });
        if (sigCheck.valid) break;
      }

      if (!sigCheck.valid) {
        console.error(`[SASPAY WEBHOOK REJECT] Échec vérification cryptographique HMAC : ${sigCheck.reason}`);
        return res.status(401).json({ error: `Signature webhook SasPay invalide (${sigCheck.reason})` });
      }

      let payload = {};
      try {
        payload = JSON.parse(rawBuffer.toString('utf8'));
      } catch (_jsonErr) {
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }

      const event = eventName || payload.event;
      console.log(`[SASPAY WEBHOOK VALIDATED] Événement: ${event || 'inconnu'}`);

      if (event === 'webhook.test') {
        return res.status(200).json({ received: true, test: true });
      }

      const result = await processWebhookTransaction({ ...payload, provider: 'SASPAY' }, { gateway: 'saspay', signature });
      return res.status(200).json({ received: true, ...result });
    } catch (err) {
      console.error('[SASPAY WEBHOOK ERROR]', err.message);
      const isClientErr = ['MISSING_WEBHOOK_STATUS', 'AMOUNT_MISMATCH', 'ORDER_ALREADY_PAID', 'ORDER_NOT_FOUND'].includes(err.code || err.message);
      return res.status(isClientErr ? 400 : 500).json({ error: err.message, code: err.code || null });
    }
  }
);

// ============================================================================
// ROUTE 4 : Initiation d'une Transaction vers la Banque / Agrégateur via IP Statique
// ============================================================================
/**
 * POST /api/payment/initiate
 * Appelle l'API de la banque (ex: CinetPay, Wave, Orange Money) en passant par Fixie
 */
app.post('/api/payment/initiate', async (req, res) => {
  try {
    const { provider, amount, currency = 'XOF', customerPhone, customerEmail, description, targetBankApiUrl, payload } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Montant de paiement invalide.' });
    }

    const txId = `TX_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Si une URL bancaire spécifique est fournie, vérifier qu'elle est dans l'allowlist anti-SSRF
    if (targetBankApiUrl) {
      if (!isAllowedBankProxyUrl(targetBankApiUrl)) {
        return res.status(403).json({
          success: false,
          error: 'URL de passerelle bancaire non autorisée (protection anti-SSRF).'
        });
      }
      console.log(`[BANK OUTBOUND] Appel sortant vers ${targetBankApiUrl} via proxy Fixie IP Statique...`);
      const bankResponse = await fetchViaFixie(targetBankApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers['authorization'] || ''
        },
        body: JSON.stringify(payload || {
          amount,
          currency,
          customerPhone,
          txId
        })
      });

      const bankData = await bankResponse.json().catch(() => ({}));
      return res.status(bankResponse.status).json({
        success: bankResponse.ok,
        viaFixieProxy: Boolean(FIXIE_URL),
        txId,
        bankResponse: bankData
      });
    }

    // Réponse standard d'initialisation
    return res.json({
      success: true,
      txId,
      provider: provider || 'SOVEREIGN_GATEWAY',
      amount,
      currency,
      status: 'PENDING',
      message: 'Transaction initialisée avec succès. En attente de règlement.',
      ipWhitelistedGateway: Boolean(FIXIE_URL)
    });
  } catch (err) {
    console.error('[INITIATE PAYMENT ERROR]', err);
    return res.status(500).json({ error: 'Échec initialisation paiement', details: err.message });
  }
});

// ============================================================================
// ROUTE 5 : Proxy Bancaire Universel Sécurisé (Banque / Telco avec IP Statique)
// ============================================================================
/**
 * POST /api/payment/bank-proxy
 * Protégé par authentification admin + allowlist stricte anti-SSRF.
 */
app.post('/api/payment/bank-proxy', requireInternalAdminAuth, async (req, res) => {
  try {
    const { endpoint, method = 'POST', headers = {}, body } = req.body;

    if (!endpoint || !isAllowedBankProxyUrl(endpoint)) {
      return res.status(403).json({
        error: 'Paramètre "endpoint" invalide ou domaine non autorisé dans la liste blanche bancaire.'
      });
    }

    console.log(`[BANK PROXY] Relais vers ${endpoint} (${method}) via Fixie...`);

    const proxyOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (method !== 'GET' && method !== 'HEAD' && body) {
      proxyOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetchViaFixie(endpoint, proxyOptions);
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
  } catch (err) {
    console.error('[BANK PROXY ERROR]', err);
    return res.status(500).json({
      error: 'Erreur lors du relais bancaire via proxy statique',
      details: err.message
    });
  }
});

// ============================================================================
// ROUTE 5b : PONT NANASWITCH (PATTERN STRATEGY / ADAPTER)
// ============================================================================
/**
 * POST /api/payments/initiate & POST /api/switch/initiate
 * Initiation unifiée via la passerelle choisie (Sebpay, Wave, etc.)
 */
app.post(['/api/payments/initiate', '/api/switch/initiate', '/api/payment/switch/initiate'], async (req, res) => {
  const startTs = Date.now();
  try {
    const {
      gateway = switchManager.getPrimaryGateway(),
      orderId: rawOrderId,
      storeId = 'nanasore_central_hub',
      amount: clientAmount,
      currency = 'XOF',
      customerPhone,
      phone,
      customerEmail,
      customerName = 'Client Wameet',
      description = 'Commande Wameet / Nanasore Live',
      returnUrl: rawReturnUrl,
      callbackUrl: rawCallbackUrl,
      country,
      countryCode,
      operator = req.body.provider || req.body.operator_code || req.body.slug,
      otpCode = req.body.otp || req.body.otp_code || req.body.authorization_code,
      metadata = {}
    } = req.body;

    const orderId = rawOrderId || `ORD_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    let amount = Number(clientAmount || 0);
    let dbTenantId = null;

    // 0. Source de vérité serveur (Audit C1, C4, M5) : Si orderId existe en base Supabase, lire montant et statut !
    const supabase = getSupabaseAdmin();
    if (supabase && rawOrderId) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, total_amount, status, payment_status, tenant_id')
        .eq('id', String(rawOrderId))
        .maybeSingle();

      if (existingOrder) {
        const isAlreadyPaid =
          String(existingOrder.payment_status || '').toLowerCase() === 'paid' ||
          ['paid', 'completed'].includes(String(existingOrder.status || '').toLowerCase());
        if (isAlreadyPaid) {
          return res.status(409).json({
            success: false,
            errorCode: 'ORDER_ALREADY_PAID',
            error: `La commande #${rawOrderId} est déjà payée.`
          });
        }
        if (Number(existingOrder.total_amount) > 0) {
          amount = Number(existingOrder.total_amount);
        }
        if (existingOrder.tenant_id) {
          dbTenantId = String(existingOrder.tenant_id);
        }
      }
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Montant de paiement invalide (amount > 0 requis).' });
    }

    // 1. Authentification & Résolution du Marchand (B2B Hybride : Agrégé vs Développeurs BYOK)
    const apiKeyHeader = req.headers['x-nanaswitch-skey'] || req.headers['x-nanaswitch-key'] || req.headers['x-api-key'] || req.headers['authorization'] || '';
    const merchantIdParam = dbTenantId || req.body.merchantId || req.body.merchant_id || storeId;
    const merchant = await merchantService.resolveMerchant(db, apiKeyHeader, merchantIdParam);

    // 1.b. Contrôle strict du risque & des plafonds mensuels KYC (Particulier: 1M XOF vs Entreprise: 5M XOF)
    const kycLimitCheck = await checkTransactionLimit(db, merchant, amount);
    if (!kycLimitCheck.allowed) {
      return res.status(403).json(kycLimitCheck.errorResponse);
    }

    // 2. Coupe-circuit immédiat si solde de crédits API épuisé (0.02 XOF / 1 crédit par appel)
    const creditCheck = await pricingEngine.verifyAndCheckApiCredits(db, merchant);
    if (!creditCheck.allowed) {
      return res.status(402).json(creditCheck.errorResponse);
    }

    // 3. Référence serveur unique & assainissement des URLs (Audit C4, M6)
    const resolvedMerchantId = dbTenantId || merchant?.merchant_id || 'm_live_bf_001';
    const paymentReference = `PAY_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const externalReference = `${resolvedMerchantId}___${orderId}`;
    const returnUrl = sanitizeRedirectUrl(rawReturnUrl, 'https://nsore.shop');
    const callbackUrl = sanitizeRedirectUrl(rawCallbackUrl, process.env.PAYMENT_CALLBACK_URL || 'https://nana-payment-api.onrender.com/api/payment/webhook');

    // Clés personnalisées si le marchand est en mode BYOK
    const customCredentials = (merchant?.integration_config?.mode === 'BYOK')
      ? merchant.integration_config.custom_credentials
      : null;

    console.log(`[NANASWITCH INITIATE] Initiation paiement #${orderId} (${amount} ${currency}) | Marchand: [${resolvedMerchantId}] (Mode: ${merchant?.integration_config?.mode || 'AGREGATED'}) | Passerelle: [${gateway}]...`);

    const initResult = await switchManager.initiatePaymentWithFailover(gateway, {
      orderId,
      storeId: resolvedMerchantId,
      tenantId: resolvedMerchantId,
      merchantId: resolvedMerchantId,
      externalReference,
      amount: Number(amount),
      currency,
      customerPhone: customerPhone || phone,
      phone: customerPhone || phone,
      customerEmail,
      customerName,
      country: country || countryCode,
      operator,
      otpCode,
      description,
      returnUrl,
      callbackUrl,
      metadata,
      customCredentials
    }, { db });

    const finalGateway = initResult.gateway || gateway;

    if (db) {
      try {
        const nowServer = admin.firestore.FieldValue.serverTimestamp();
        const intentPayload = {
          id: orderId,
          orderId,
          storeId,
          amount: Number(amount),
          currency,
          gateway: finalGateway,
          provider: finalGateway.toUpperCase(),
          failedOver: Boolean(initResult.failedOver),
          originalGateway: initResult.originalGateway || null,
          failoverReason: initResult.failoverReason || null,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentUrl: initResult.paymentUrl || initResult.checkout_url || null,
          redirectUrl: initResult.paymentUrl || initResult.checkout_url || null,
          transactionId: initResult.transactionId || null,
          customerPhone: customerPhone || phone || null,
          customerEmail: customerEmail || null,
          customerName: customerName || null,
          description,
          createdAt: nowServer,
          updatedAt: nowServer
        };

        await db.collection('payment_intents').doc(orderId).set(intentPayload, { merge: true });
        console.log(`[FIRESTORE TRANSACTION] Document payment_intents/${orderId} persisté avec gateway="${finalGateway}"`);
      } catch (fbErr) {
        console.warn('[FIRESTORE INTENT WARNING]', fbErr.message);
      }
    }

    // 4. Déduction atomique de 0.02 XOF (1 crédit) et traçabilité dans api_usage & switch_logs
    if (db) {
      merchantService.recordApiUsageAndDebit(db, {
        merchantId: resolvedMerchantId,
        orderId,
        amount: Number(amount),
        currency,
        country: country || countryCode || 'BF',
        gateway: finalGateway,
        status: initResult.failedOver ? 'FAILOVER_SUCCESS' : 'SUCCESS',
        latencyMs: Math.max(10, Date.now() - startTs)
      }).catch(err => console.warn('[API METERING NOTICE]', err.message));
    }

    return res.status(200).json({
      success: true,
      action: initResult.action || (initResult.paymentUrl || initResult.checkout_url ? 'REDIRECT' : 'DIRECT'),
      failover: Boolean(initResult.failedOver || initResult.failover),
      failedOver: Boolean(initResult.failedOver || initResult.failover),
      message: initResult.message || null,
      gateway: finalGateway,
      originalGateway: initResult.originalGateway || null,
      failoverReason: initResult.failoverReason || null,
      orderId,
      storeId: resolvedMerchantId,
      merchantId: resolvedMerchantId,
      externalReference,
      amount: Number(amount),
      currency,
      checkout_url: initResult.checkout_url || initResult.paymentUrl,
      paymentUrl: initResult.paymentUrl || initResult.checkout_url,
      redirectUrl: initResult.redirectUrl || initResult.paymentUrl || initResult.checkout_url,
      transactionId: initResult.transactionId,
      reference: initResult.reference,
      rawResponse: initResult.rawResponse
    });
  } catch (err) {
    console.error('[NANASWITCH INITIATE ERROR]', err.message);
    const statusCode = err.status || (err.code === 'OTP_REQUIRED' || err.code === 'INVALID_PHONE_NUMBER' ? 400 : 500);
    return res.status(statusCode).json({
      success: false,
      code: err.code || (statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'),
      error: err.message,
      message: err.message,
      operator: err.operator || null,
      ussd_code: err.ussd_code || null,
      primaryError: err.primaryError?.message || null,
      fallbackError: err.fallbackError?.message || null
    });
  }
});

/**
 * GET /api/payments/gateways & GET /api/switch/gateways
 * Liste dynamique des passerelles enregistrées sur le Pont NaNaSwitch
 */
app.get(['/api/payments/gateways', '/api/switch/gateways'], (req, res) => {
  return res.json({
    success: true,
    service: 'NaNaSwitch Payment Bridge',
    routing: switchManager.getRoutingConfig(),
    gateways: switchManager.listGateways()
  });
});

/**
 * GET /api/system/pricing-matrix & GET /api/payments/pricing-matrix
 * Matrice tarifaire dynamique B2B (+1.5% de marge NanaSwitch)
 */
app.get(['/api/system/pricing-matrix', '/api/payments/pricing-matrix'], async (req, res) => {
  try {
    const matrix = await merchantService.getPricingMatrix(db);
    return res.status(200).json({
      success: true,
      pricing_matrix: matrix
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET & POST /api/switch/config & /api/payments/config
 * Lecture et mise à jour dynamique de la configuration de routage et de failover
 */
app.get(['/api/switch/config', '/api/payments/config'], (req, res) => {
  return res.json({
    success: true,
    routing: switchManager.getRoutingConfig(),
    gateways: switchManager.listGateways()
  });
});

app.post(['/api/switch/config', '/api/payments/config'], requireInternalAdminAuth, express.json(), (req, res) => {
  const { primaryGateway, fallbackGateway, primary, fallback } = req.body;
  if (primaryGateway || primary) {
    switchManager.setPrimaryGateway(primaryGateway || primary);
  }
  if (fallbackGateway || fallback) {
    switchManager.setFallbackGateway(fallbackGateway || fallback);
  }
  return res.json({
    success: true,
    message: 'Configuration NaNaSwitch mise à jour avec succès.',
    routing: switchManager.getRoutingConfig()
  });
});

/**
 * GET /api/switch/verify/:transactionId & /api/payments/verify/:transactionId
 * Vérification universelle et unifiée du statut d'une transaction
 */
app.get(['/api/switch/verify/:transactionId', '/api/payments/verify/:transactionId'], async (req, res) => {
  try {
    const { transactionId } = req.params;
    const gateway = req.query.gateway || null;
    const externalRef = req.query.externalReference || req.query.external_reference || null;
    const statusResult = await switchManager.checkPaymentStatus(transactionId, gateway, externalRef);
    return res.json({
      success: true,
      transactionId,
      gateway: gateway || switchManager.getPrimaryGateway(),
      ...statusResult
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ROUTE 5b : SMART ESCROW CHAT WAMEET (INITIATION & LIBÉRATION DES FONDS)
// ============================================================================
/**
 * 1. POST /api/escrow/initiate & POST /api/payments/escrow/initiate
 * Initialise une transaction séquestre pour un achat dans le chat Wameet
 * et génère le lien de paiement Mobile Money sécurisé via Sebpay.
 */
app.post(['/api/escrow/initiate', '/api/payments/escrow/initiate'], async (req, res) => {
  try {
    const {
      chatId,
      messageId,
      transactionId: customTxId,
      itemTitle,
      amount,
      currency = 'XOF',
      buyerPhone,
      buyerName = 'Acheteur Wameet',
      buyerId,
      sellerId,
      operator = 'MOMO'
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Montant invalide pour le séquestre.' });
    }

    const transactionId = customTxId || `ESC_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const externalReference = `escrow___${transactionId}`;

    console.log(`[SMART ESCROW INITIATE] ${transactionId} | Article: ${itemTitle} | Montant: ${amount} ${currency}`);

    const callbackUrl = process.env.PAYMENT_CALLBACK_URL || process.env.PAYMENT_WEBHOOK_URL || 'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run/api/payment/webhook';

    const targetGateway = req.body.gateway || switchManager.getPrimaryGateway();
    const sebpayResult = await switchManager.initiatePaymentWithFailover(targetGateway, {
      tenantId: sellerId || 'wameet_seller',
      storeId: sellerId || 'wameet_seller',
      orderId: transactionId,
      externalReference,
      amount: Number(amount),
      currency,
      country: req.body.country || req.body.country_code || req.body.countryCode,
      phone: buyerPhone,
      customerPhone: buyerPhone,
      customerName: buyerName,
      operator,
      description: `Smart Escrow: ${itemTitle}`,
      callbackUrl
    }, { db });

    const paymentUrl = sebpayResult.paymentUrl || sebpayResult.checkout_url || sebpayResult.provider_link || sebpayResult.redirectUrl;

    if (db) {
      const nowServer = admin.firestore.FieldValue.serverTimestamp();
      const escrowRef = db.collection('wameet_escrow_transactions').doc(transactionId);

      await escrowRef.set({
        id: transactionId,
        transactionId,
        externalReference,
        chatId: chatId || null,
        messageId: messageId || null,
        itemTitle: itemTitle || 'Article Wameet',
        amount: Number(amount),
        currency,
        buyerPhone: buyerPhone || '',
        buyerName,
        buyerId: buyerId || '',
        sellerId: sellerId || '',
        escrowStatus: 'pending',
        paymentUrl,
        operator,
        createdAt: nowServer,
        updatedAt: nowServer
      }, { merge: true });

      if (chatId && messageId) {
        const msgRef = db.collection('wameet_chats').doc(chatId).collection('messages').doc(messageId);
        await msgRef.set({
          transactionId,
          escrowStatus: 'pending',
          paymentUrl,
          updatedAt: nowServer
        }, { merge: true }).catch(() => {});
      }
    }

    return res.json({
      success: true,
      transactionId,
      paymentUrl,
      providerLink: paymentUrl,
      escrowStatus: 'pending',
      message: 'Transaction séquestre initialisée. En attente de paiement Mobile Money.'
    });
  } catch (err) {
    console.error('[SMART ESCROW INITIATE ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. POST /api/escrow/release & POST /api/payments/escrow/release
 * Déclenché par l'ACHETEUR authentifié ou Super Admin qui confirme la réception.
 */
app.post(['/api/escrow/release', '/api/payments/escrow/release'], requireInternalAdminAuth, async (req, res) => {
  try {
    const { transactionId, chatId, messageId, buyerId } = req.body;
    const authenticatedActorId = req.authUser?.id || buyerId || '';

    if (!transactionId) {
      return res.status(400).json({ success: false, error: 'transactionId obligatoire.' });
    }

    console.log(`[SMART ESCROW RELEASE] Transaction: ${transactionId} demandée par: ${authenticatedActorId || 'internal-admin'}`);

    if (!db) {
      return res.status(503).json({ success: false, error: 'Base de données séquestre indisponible.' });
    }

    const escrowRef = db.collection('wameet_escrow_transactions').doc(transactionId);
    const escrowSnap = await escrowRef.get();

    if (!escrowSnap.exists) {
      return res.status(404).json({ success: false, error: 'Transaction séquestre introuvable.' });
    }

    const escrowData = escrowSnap.data();

    // Vérification stricte de propriété (jamais contournée si buyerId est omis)
    if (!req.isInternalAdmin && escrowData.buyerId && escrowData.buyerId !== authenticatedActorId) {
      return res.status(403).json({ success: false, error: 'Seul l\'acheteur enregistré peut confirmer la réception.' });
    }

    if (escrowData.escrowStatus === 'released') {
      return res.json({
        success: true,
        alreadyReleased: true,
        message: 'Les fonds ont déjà été libérés pour cette transaction.'
      });
    }

    if (escrowData.escrowStatus !== 'locked' && !escrowData.isPaid) {
      return res.status(400).json({
        success: false,
        error: `Impossible de libérer des fonds au statut actuel (${escrowData.escrowStatus}). Le paiement doit d'abord être sous séquestre (locked).`
      });
    }

    const nowServer = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    // 1. Marquer le séquestre comme libéré
    batch.set(escrowRef, {
      escrowStatus: 'released',
      status: 'released',
      releasedAt: nowServer,
      releasedBy: buyerId || 'buyer',
      updatedAt: nowServer
    }, { merge: true });

    // 2. Mettre à jour le message dans le chat Wameet
    const effectiveChatId = chatId || escrowData.chatId;
    const effectiveMessageId = messageId || escrowData.messageId;

    if (effectiveChatId && effectiveMessageId) {
      const msgRef = db.collection('wameet_chats').doc(effectiveChatId).collection('messages').doc(effectiveMessageId);
      batch.set(msgRef, {
        escrowStatus: 'released',
        status: 'released',
        releasedAt: nowServer,
        updatedAt: nowServer
      }, { merge: true });

      // Diffuse l'événement WebSocket transaction_updated aux clients connectés
      broadcastToChat(effectiveChatId, 'transaction_updated', {
        transactionId,
        messageId: effectiveMessageId,
        chatId: effectiveChatId,
        status: 'released',
        escrowStatus: 'released',
        updatedAt: nowServer
      });
    }

    // 3. Créditer le wallet du vendeur (Split : 95% vendeur / 5% Nanasore)
    const sellerId = escrowData.sellerId || 'seller';
    const amount = Number(escrowData.amount || 0);
    const sellerShare = Math.round(amount * 0.95);
    const platformShare = amount - sellerShare;

    const sellerWalletRef = db.collection('wallets').doc(sellerId);
    batch.set(sellerWalletRef, {
      tenantId: sellerId,
      balance: admin.firestore.FieldValue.increment(sellerShare),
      totalEarnings: admin.firestore.FieldValue.increment(sellerShare),
      escrowReleasedCount: admin.firestore.FieldValue.increment(1),
      updatedAt: nowServer
    }, { merge: true });

    await batch.commit();

    console.log(`[SMART ESCROW RELEASE SUCCESS] ${amount} FCFA : ${sellerShare} FCFA au vendeur (${sellerId}) et ${platformShare} FCFA commission.`);

    return res.json({
      success: true,
      transactionId,
      escrowStatus: 'released',
      amountReleased: sellerShare,
      commission: platformShare,
      message: 'Fonds libérés avec succès au vendeur. Transaction Smart Escrow terminée.'
    });
  } catch (err) {
    console.error('[SMART ESCROW RELEASE ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ROUTE 5b ter : AUTO-CHECKOUT PAR IA (AGENT COMMERCIAL INVISIBLE GEMINI)
// ============================================================================
/**
 * POST /api/ai/analyze-order-intent
 * Analyse silencieusement la conversation pour détecter une intention d'achat
 * et renvoie la structure de commande si trouvée (ou null silencieux).
 */
app.post('/api/ai/analyze-order-intent', async (req, res) => {
  try {
    const { chatHistory, currentInventory, message } = req.body;
    const historyToAnalyze = chatHistory || message || '';

    const intentResult = await analyzeChatIntent(historyToAnalyze, currentInventory);

    return res.json({
      success: true,
      hasIntent: Boolean(intentResult?.isOrderIntent),
      intent: intentResult
    });
  } catch (err) {
    // Règle stricte : Ne jamais bloquer le chat ni crasher en cas d'erreur IA
    console.warn('[AI CHECKOUT ROUTE SILENT CATCH]', err.message);
    return res.json({
      success: true,
      hasIntent: false,
      intent: null
    });
  }
});

// ============================================================================
// ROUTE 5b quater : SYNCHRONISATION PROGRESSION TUTOR LMS (WAMEET CHANNELS)
// ============================================================================
/**
 * POST /api/lms/progress
 * Enregistre l'avancement d'un apprenant (Vidéo validée ou Quiz réussi),
 * synchronise avec Firestore et notifie le backend Tutor LMS / WordPress.
 */
app.post('/api/lms/progress', async (req, res) => {
  try {
    const {
      userId,
      channelId,
      courseId,
      lessonId,
      type = 'video',
      score = 0,
      isCompleted = true,
      lessonTitle,
      moduleIndex,
      metadata = {}
    } = req.body;

    if (!userId || !lessonId) {
      return res.status(400).json({
        success: false,
        error: 'Champs obligatoires manquants : userId et lessonId sont requis.'
      });
    }

    const effectiveChannelId = channelId || courseId || 'wameet_global_channel';
    const effectiveCourseId = courseId || channelId || 'default_course';
    const numScore = Number(score) || 0;
    const progressDocId = `${userId}_${effectiveChannelId}`;

    console.log(`[LMS PROGRESS] Mise à jour pour ${userId} sur leçon ${lessonId} (Type: ${type}, Score: ${numScore})`);

    let updatedProgress = {
      userId,
      channelId: effectiveChannelId,
      courseId: effectiveCourseId,
      lastCompletedLessonId: lessonId,
      type,
      score: numScore,
      isCompleted: isCompleted !== false,
      timestamp: new Date().toISOString()
    };

    if (db) {
      const nowServer = admin.firestore.FieldValue.serverTimestamp();
      const progressRef = db.collection('wameet_course_progress').doc(progressDocId);

      // 1. Mise à jour atomique du document de progression dans Wameet
      await progressRef.set({
        userId,
        channelId: effectiveChannelId,
        courseId: effectiveCourseId,
        completedLessonIds: admin.firestore.FieldValue.arrayUnion(lessonId),
        lastCompletedLessonId: lessonId,
        totalScore: admin.firestore.FieldValue.increment(numScore),
        completedCount: admin.firestore.FieldValue.increment(1),
        [`lessons.${lessonId}`]: {
          lessonId,
          lessonTitle: lessonTitle || null,
          type,
          score: numScore,
          isCompleted: isCompleted !== false,
          moduleIndex: moduleIndex || null,
          completedAt: nowServer
        },
        metadata,
        updatedAt: nowServer
      }, { merge: true });

      // 2. Synchronisation croisée avec le profil étudiant de la plateforme Tutor LMS (collection students/{userId}/progress/{courseId})
      const studentProgressRef = db
        .collection('students')
        .doc(userId)
        .collection('progress')
        .doc(effectiveCourseId);

      await studentProgressRef.set({
        studentId: userId,
        courseId: effectiveCourseId,
        completedLessonIds: admin.firestore.FieldValue.arrayUnion(lessonId),
        lastUpdated: Date.now(),
        [`grades.${lessonId}`]: {
          type,
          score: numScore,
          passed: true,
          completedAt: Date.now()
        }
      }, { merge: true }).catch(err => {
        console.warn('[LMS PROGRESS NOTICE] Erreur synchro students doc :', err.message);
      });

      // 3. Enregistrement d'un log dans l'historique d'apprentissage
      await progressRef.collection('history').add({
        lessonId,
        lessonTitle: lessonTitle || null,
        type,
        score: numScore,
        createdAt: nowServer
      }).catch(() => {});

      // 4. Synchronisation externe optionnelle avec l'API Tutor LMS / WordPress si configurée
      const tutorLmsBaseUrl = process.env.TUTOR_LMS_API_URL || process.env.WP_TUTOR_ENDPOINT;
      if (tutorLmsBaseUrl) {
        try {
          console.log(`[TUTOR LMS SYNC] Envoi de l'événement de progression vers ${tutorLmsBaseUrl}...`);
          fetch(`${tutorLmsBaseUrl}/wp-json/tutor/v1/course-progress`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.TUTOR_LMS_API_KEY ? { 'Authorization': `Bearer ${process.env.TUTOR_LMS_API_KEY}` } : {})
            },
            body: JSON.stringify({
              user_id: userId,
              course_id: effectiveCourseId,
              lesson_id: lessonId,
              completed: isCompleted,
              score: numScore
            })
          }).catch(syncErr => {
            console.warn('[TUTOR LMS SYNC NOTICE] Erreur non bloquante de synchro WP :', syncErr.message);
          });
        } catch (syncEx) {
          console.warn('[TUTOR LMS SYNC NOTICE] Exception webhook Tutor LMS :', syncEx.message);
        }
      }

      // Lecture de la progression à jour pour la réponse
      const snap = await progressRef.get();
      if (snap.exists) {
        const d = snap.data();
        updatedProgress = {
          userId,
          channelId: effectiveChannelId,
          courseId: effectiveCourseId,
          completedLessonIds: d.completedLessonIds || [lessonId],
          totalScore: d.totalScore || numScore,
          completedCount: d.completedCount || (d.completedLessonIds?.length || 1),
          lastCompletedLessonId: lessonId,
          updatedAt: new Date().toISOString()
        };
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Progression Tutor LMS enregistrée avec succès.',
      progress: updatedProgress
    });
  } catch (err) {
    console.error('[LMS PROGRESS FATAL ERROR]', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/lms/progress
 * Récupère l'état d'avancement d'un utilisateur dans une chaîne ou un cours
 */
app.get('/api/lms/progress', async (req, res) => {
  try {
    const { userId, channelId, courseId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre "userId" obligatoire.'
      });
    }

    const effectiveChannelId = channelId || courseId || 'wameet_global_channel';
    const progressDocId = `${userId}_${effectiveChannelId}`;

    if (db) {
      const snap = await db.collection('wameet_course_progress').doc(progressDocId).get();
      if (snap.exists) {
        const data = snap.data();
        return res.json({
          success: true,
          progress: {
            userId,
            channelId: effectiveChannelId,
            courseId: data.courseId || effectiveChannelId,
            completedLessonIds: data.completedLessonIds || [],
            totalScore: data.totalScore || 0,
            completedCount: data.completedCount || (data.completedLessonIds?.length || 0),
            lastCompletedLessonId: data.lastCompletedLessonId || null,
            lessons: data.lessons || {},
            updatedAt: data.updatedAt ? data.updatedAt.toDate?.()?.toISOString() : null
          }
        });
      }
    }

    // Valeur par défaut si aucun progrès enregistré
    return res.json({
      success: true,
      progress: {
        userId,
        channelId: effectiveChannelId,
        courseId: courseId || effectiveChannelId,
        completedLessonIds: [],
        totalScore: 0,
        completedCount: 0,
        lastCompletedLessonId: null,
        lessons: {},
        updatedAt: null
      }
    });
  } catch (err) {
    console.error('[LMS GET PROGRESS ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ROUTE 5c : YOUTUBE DATA API V3 & GOOGLE OAUTH2 (WAMEET LIVE)
// ============================================================================
/**
 * GET /api/youtube/auth-url
 * Génère l'URL d'autorisation Google OAuth2 avec scopes YouTube Data v3
 */
app.get('/api/youtube/auth-url', (req, res) => {
  try {
    const { state } = req.query;
    const authUrl = generateYouTubeAuthUrl(state);
    return res.json({ success: true, authUrl });
  } catch (err) {
    console.error('[YOUTUBE AUTH URL ERROR]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/youtube/callback
 * Point de terminaison de redirection OAuth2 de Google :
 * Échange du code temporaire contre Tokens et persistance sécurisée dans Firestore
 */
app.get('/api/youtube/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) {
      console.error('[YOUTUBE OAUTH ERROR]', error);
      return res.status(400).send(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #ef4444;">Erreur d'autorisation Google</h2>
          <p>${error}</p>
        </div>
      `);
    }

    if (!code) {
      return res.status(400).send(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #ef4444;">Code d'autorisation manquant</h2>
          <p>Le paramètre "code" n'a pas été renvoyé par Google.</p>
        </div>
      `);
    }

    console.log('[YOUTUBE OAUTH] Échange du code d\'autorisation...');
    const tokens = await exchangeCodeForTokens(code);

    if (db) {
      await saveYouTubeTokensToFirestore(db, { userId: 'pousbila04', tokens });
      console.log('[YOUTUBE OAUTH] Tokens YouTube sauvegardés dans Firestore (system_configs/youtube_oauth).');
    }

    return res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Connexion YouTube Réussie - NaNaSwitch / Wameet</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #111827; border: 1px solid #1f2937; border-radius: 20px; padding: 40px 32px; max-width: 440px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
          .icon { width: 64px; height: 64px; background: rgba(16, 185, 129, 0.15); color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px; }
          h2 { margin: 0 0 12px 0; font-size: 22px; color: #fff; font-weight: 700; }
          p { color: #9ca3af; font-size: 14px; line-height: 1.6; margin-bottom: 28px; }
          .btn { background: #e11d48; color: white; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; display: inline-block; font-size: 15px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h2>YouTube Data API Connectée</h2>
          <p>Le compte <strong>pousbila04@gmail.com</strong> a été associé avec succès à Wameet & NaNaSwitch.<br>Les jetons d'accès ont été sécurisés dans Firestore.</p>
          <a class="btn" href="javascript:window.close();">Fermer la fenêtre</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('[YOUTUBE CALLBACK FATAL ERROR]', err);
    return res.status(500).send(`
      <div style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h2 style="color: #ef4444;">Échec de la validation OAuth2</h2>
        <p>${err.message}</p>
      </div>
    `);
  }
});

/**
 * GET /api/youtube/status
 * Diagnostic de l'état d'autorisation YouTube (Sans fuite de clé secrète)
 */
app.get('/api/youtube/status', (req, res) => {
  return res.json(getYouTubeOAuthStatus());
});

// ============================================================================
// ROUTE 5d : STREAM ROUTER INTELLIGENT (YOUTUBE DATA V3 / JITSI MEET FAILOVER)
// ============================================================================
/**
 * POST /api/lives/start & POST /api/live/start
 * Déclenche une session Live vendeur avec basculement automatique :
 * - Scénario A : Quota < 30 -> YouTube Live Data v3
 * - Scénario B : Quota >= 30 ou Erreur/Timeout YouTube -> Jitsi Meet HD en < 2ms
 */
app.post(['/api/lives/start', '/api/live/start'], async (req, res) => {
  try {
    const {
      storeId = 'nanasore_central_hub',
      title = 'Live Shopping Wameet 🔥',
      description = 'Session de vente directe sur Wameet & Nanasore',
      hostName = 'Vendeur Wameet',
      hostAvatar,
      forceProvider,
      metadata = {}
    } = req.body;

    const sessionResult = await startLiveSession(db, {
      storeId,
      title,
      description,
      hostName,
      hostAvatar,
      forceProvider,
      metadata
    });

    return res.status(200).json({
      success: true,
      ...sessionResult
    });
  } catch (err) {
    console.error('[STREAM ROUTER FATAL ERROR]', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/lives/quota & GET /api/live/quota
 * Consultation en direct du quota de diffusion YouTube restant pour aujourd'hui
 */
app.get(['/api/lives/quota', '/api/live/quota'], async (req, res) => {
  try {
    const quota = await getDailyQuotaStatus(db);
    return res.json({
      success: true,
      service: 'Stream Router Quota Monitor',
      ...quota
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/lives/:liveId
 * Récupère les métadonnées et le statut en direct d'un live
 */
app.get('/api/lives/:liveId', async (req, res) => {
  try {
    const { liveId } = req.params;
    if (!liveId) return res.status(400).json({ error: 'liveId requis' });

    if (db) {
      const snap = await db.collection('live_events').doc(liveId).get();
      if (snap.exists) {
        return res.json({ success: true, live: snap.data() });
      }
    }

    return res.status(404).json({ success: false, message: 'Événement Live non trouvé' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/lives/:liveId/stop & POST /api/live/stop
 * Clôture d'une session de direct
 */
app.post(['/api/lives/:liveId/stop', '/api/live/stop'], async (req, res) => {
  try {
    const liveId = req.params.liveId || req.body.liveId;
    if (!liveId) return res.status(400).json({ error: 'liveId requis' });

    if (db) {
      await db.collection('live_events').doc(liveId).set({
        status: 'ended',
        endedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return res.json({ success: true, liveId, status: 'ended' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ROUTE 5e : GROUPES ÉPHÉMÈRES GÉOLOCALISÉS & LIVE SHOPPING FLASH (WAMEET)
// ============================================================================

/**
 * POST /api/flash-live/rooms/init
 * Initialise un salon de Live Shopping éphémère géolocalisé avec date d'expiration (expiresAt)
 */
app.post('/api/flash-live/rooms/init', async (req, res) => {
  try {
    const {
      roomId,
      title = 'Vente Flash Live Shopping Wameet 🔥',
      sellerId = 'seller_wameet_01',
      sellerName = 'Boutique Partenaire Wameet',
      sellerAvatar,
      location = 'Abidjan • Cocody (15 km)',
      durationMinutes = 45,
      youtubeUrl = 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      initialProduct = null
    } = req.body;

    if (!roomId) {
      return res.status(400).json({ success: false, error: 'Paramètre "roomId" requis.' });
    }

    const now = Date.now();
    const durationMs = (Number(durationMinutes) || 45) * 60 * 1000;
    const expiresAtMs = now + durationMs;
    const expiresAt = new Date(expiresAtMs).toISOString();

    console.log(`[FLASH LIVE ROOM INIT] Initialisation salon ${roomId} - Expire à : ${expiresAt}`);

    const roomData = {
      roomId,
      title,
      sellerId,
      sellerName,
      sellerAvatar: sellerAvatar || null,
      location,
      durationMinutes: Number(durationMinutes) || 45,
      youtubeUrl,
      createdAtMs: now,
      expiresAt,
      expiresAtMs,
      status: 'active',
      pushedProduct: initialProduct || null,
      viewersCount: 1,
      isExpired: false
    };

    if (db) {
      const nowServer = admin.firestore.FieldValue.serverTimestamp();
      const batch = db.batch();

      // 1. Sauvegarde dans la collection dédiée flash_live_rooms
      const roomRef = db.collection('flash_live_rooms').doc(roomId);
      batch.set(roomRef, {
        ...roomData,
        createdAt: nowServer,
        updatedAt: nowServer
      }, { merge: true });

      // 2. Synchronisation avec live_events pour rétrocompatibilité
      const liveEventRef = db.collection('live_events').doc(roomId);
      batch.set(liveEventRef, {
        id: roomId,
        title,
        hostName: sellerName,
        hostAvatar: sellerAvatar || null,
        status: 'live',
        activeProductId: initialProduct?.id || null,
        activeProduct: initialProduct || null,
        expiresAt,
        location,
        updatedAt: nowServer
      }, { merge: true });

      await batch.commit();
    }

    return res.status(200).json({
      success: true,
      message: 'Salon Live Shopping éphémère initialisé avec succès.',
      room: roomData
    });
  } catch (err) {
    console.error('[FLASH LIVE ROOM INIT ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/flash-live/rooms/push-product
 * Le vendeur pousse instantanément un produit en vedette aux clients connectés
 */
app.post('/api/flash-live/rooms/push-product', async (req, res) => {
  try {
    const { roomId, product } = req.body;

    if (!roomId || !product || !product.id) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres "roomId" et "product" (avec id) obligatoires.'
      });
    }

    console.log(`[FLASH LIVE PUSH PRODUCT] Salon ${roomId} -> Produit ${product.id} (${product.title})`);

    if (db) {
      const nowServer = admin.firestore.FieldValue.serverTimestamp();
      const batch = db.batch();

      // 1. Mise à jour dans flash_live_rooms
      const roomRef = db.collection('flash_live_rooms').doc(roomId);
      batch.set(roomRef, {
        pushedProduct: product,
        pushedAt: nowServer,
        updatedAt: nowServer
      }, { merge: true });

      // 2. Mise à jour dans live_events (déclenche instantanément les onSnapshot clients)
      const liveEventRef = db.collection('live_events').doc(roomId);
      batch.set(liveEventRef, {
        activeProductId: product.id,
        activeProduct: product,
        updatedAt: nowServer
      }, { merge: true });

      await batch.commit();
    }

    return res.status(200).json({
      success: true,
      message: 'Produit poussé avec succès à tous les spectateurs en direct.',
      pushedProduct: product
    });
  } catch (err) {
    console.error('[FLASH LIVE PUSH PRODUCT ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/flash-live/rooms/close
 * Fermeture et destruction du salon éphémère (déclenche la redirection vers l'accueil)
 */
app.post('/api/flash-live/rooms/close', async (req, res) => {
  try {
    const { roomId, farewellMessage } = req.body;

    if (!roomId) {
      return res.status(400).json({ success: false, error: 'Paramètre "roomId" requis.' });
    }

    const farewell =
      farewellMessage ||
      "Merci à tous d'avoir participé à notre Vente Flash Live Shopping ! Le direct est maintenant terminé et le salon est clos.";

    console.log(`[FLASH LIVE ROOM CLOSE] Clôture définitive du salon ${roomId}`);

    if (db) {
      const nowServer = admin.firestore.FieldValue.serverTimestamp();
      const batch = db.batch();

      const roomRef = db.collection('flash_live_rooms').doc(roomId);
      batch.set(roomRef, {
        status: 'closed',
        isExpired: true,
        closedAt: nowServer,
        farewellMessage: farewell,
        updatedAt: nowServer
      }, { merge: true });

      const liveEventRef = db.collection('live_events').doc(roomId);
      batch.set(liveEventRef, {
        status: 'ended',
        endedAt: nowServer,
        updatedAt: nowServer
      }, { merge: true });

      await batch.commit();
    }

    return res.status(200).json({
      success: true,
      status: 'closed',
      farewellMessage: farewell,
      message: 'Salon Flash Live fermé avec succès.'
    });
  } catch (err) {
    console.error('[FLASH LIVE ROOM CLOSE ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/flash-live/rooms/:roomId
 * Consultation des données et du compte à rebours d'un salon éphémère
 */
app.get('/api/flash-live/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ error: 'roomId requis' });

    if (db) {
      const snap = await db.collection('flash_live_rooms').doc(roomId).get();
      if (snap.exists) {
        return res.json({ success: true, room: snap.data() });
      }
    }

    return res.status(404).json({ success: false, message: 'Salon non trouvé' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ROUTE 6 : NANASWITCH CLOUD NODE — ROUTEUR SAAS MULTI-CONNECTEURS & VAULT AES-256
// ============================================================================

const NANASWITCH_MASTER_KEY = process.env.NANASWITCH_MASTER_KEY || '';
const NANASWITCH_SALT = process.env.NANASWITCH_VAULT_SALT || 'nanaswitch_cloud_node_master_salt_2026';

function deriveNodeKey(secret = NANASWITCH_MASTER_KEY) {
  if (!secret) {
    throw new Error('NANASWITCH_MASTER_KEY non configuré sur le serveur.');
  }
  return crypto.pbkdf2Sync(secret, NANASWITCH_SALT, 100000, 32, 'sha256');
}

/**
 * Chiffre un secret avec AES-256-GCM compatible Web Crypto API
 * Format de sortie : aes256gcm:<12-bytes-iv-hex>:<ciphertext+tag-hex>
 */
function encryptNodeSecret(plainText, masterKey = NANASWITCH_MASTER_KEY) {
  if (!plainText) return '';
  const key = deriveNodeKey(masterKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `aes256gcm:${iv.toString('hex')}:${encrypted + tag}`;
}

/**
 * Déchiffre un secret chiffré AES-256-GCM
 */
function decryptNodeSecret(cipherPayload, masterKey = NANASWITCH_MASTER_KEY) {
  if (!cipherPayload) return '';
  if (!cipherPayload.startsWith('aes256gcm:')) return cipherPayload;
  const parts = cipherPayload.split(':');
  if (parts.length !== 3) return cipherPayload;
  const iv = Buffer.from(parts[1], 'hex');
  const fullCipher = Buffer.from(parts[2], 'hex');
  if (fullCipher.length < 16) return '';
  const tag = fullCipher.slice(fullCipher.length - 16);
  const data = fullCipher.slice(0, fullCipher.length - 16);
  const key = deriveNodeKey(masterKey);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(data, null, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Mapping des routes géographiques par défaut de NaNaSwitch Cloud
 */
const DEFAULT_SWITCH_ROUTING = {
  BF: { primary: 'sebpay', fallback: 'cinetpay', label: 'Burkina Faso (Orange / Moov)' },
  CI: { primary: 'cinetpay', fallback: 'paydunya', label: 'Côte d’Ivoire (Wave / MTN / Orange)' },
  SN: { primary: 'paydunya', fallback: 'cinetpay', label: 'Sénégal (Wave / Free / Orange)' },
  ML: { primary: 'cinetpay', fallback: 'sebpay', label: 'Mali (Orange / Moov Africa)' },
  BJ: { primary: 'fedapay', fallback: 'cinetpay', label: 'Bénin (MTN / Moov / FedaPay)' },
  TG: { primary: 'fedapay', fallback: 'cinetpay', label: 'Togo (T-Money / Moov)' },
  CM: { primary: 'cinetpay', fallback: 'pawapay', label: 'Cameroun (Orange / MTN)' },
  INT: { primary: 'stripe', fallback: 'cinetpay', label: 'International & Diaspora (Cartes 3DS)' }
};

/**
 * GET /v1/switch/status & GET /api/switch/status
 * Statut télémétrique en direct du Nœud Cloud NaNaSwitch
 */
app.get(['/v1/switch/status', '/api/switch/status'], async (req, res) => {
  const ipInfo = await getOutboundIp().catch(() => ({ ip: '194.163.148.22' }));
  return res.json({
    status: 'online',
    service: 'NaNaSwitch Cloud Node',
    version: '2.1.0',
    protocol: 'Zero-Trust Production TLS 1.3',
    nodeIp: ipInfo.ip || '194.163.148.22',
    uptimeSeconds: Math.floor(process.uptime()),
    features: [
      'AES-256-GCM Vault',
      'Country Smart Routing',
      '0ms Auto-Failover',
      'Cloud Credit Breaker (402)',
      'Real-time Audit Logs'
    ],
    supportedCountries: ['BF', 'CI', 'SN', 'ML', 'BJ', 'TG', 'CM', 'INT'],
    supportedConnectors: ['sebpay', 'cinetpay', 'paydunya', 'fedapay', 'ligdicash', 'pawapay', 'stripe'],
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /v1/switch/encrypt & POST /v1/switch/decrypt
 * Utilitaires de chiffrement/déchiffrement pour le coffre Cloud (AUTH ADMIN OBLIGATOIRE)
 */
app.post(['/v1/switch/encrypt', '/api/switch/encrypt'], requireInternalAdminAuth, express.json(), (req, res) => {
  const { secret } = req.body;
  if (!secret) return res.status(400).json({ error: 'Secret requis' });
  try {
    const encrypted = encryptNodeSecret(secret);
    return res.json({ success: true, encrypted });
  } catch (err) {
    return res.status(500).json({ error: 'Chiffrement indisponible', details: err.message });
  }
});

app.post(['/v1/switch/decrypt', '/api/switch/decrypt'], requireInternalAdminAuth, express.json(), (req, res) => {
  const { encrypted } = req.body;
  if (!encrypted) return res.status(400).json({ error: 'Payload chiffré requis' });
  try {
    const decrypted = decryptNodeSecret(encrypted);
    return res.json({ success: true, decrypted });
  } catch (err) {
    return res.status(400).json({ error: 'Déchiffrement impossible', details: err.message });
  }
});

/**
 * POST /v1/switch/keys/generate & POST /api/switch/keys/generate
 * Génération cryptographique sécurisée d'une paire de clés NanaSwitch (AUTH ADMIN OBLIGATOIRE)
 */
app.post(['/v1/switch/keys/generate', '/api/switch/keys/generate'], requireInternalAdminAuth, express.json(), async (req, res) => {
  try {
    const { merchantId = 'm_live_bf_001', mode = 'live', businessName, webhookUrl, webhook_url } = req.body;
    const keyPair = await generateNanaSwitchKeyPair(mode);
    const targetWebhookUrl = webhookUrl || webhook_url || null;

    // Persistance prioritaire dans Supabase `nanaswitch_merchants`
    const supabase = getSupabaseAdmin();
    if (supabase && merchantId) {
      await supabase.from('nanaswitch_merchants').upsert({
        merchant_id: String(merchantId),
        business_name: businessName || 'NANASORE TECHNOLOGIES',
        status: 'ACTIVE',
        public_key: keyPair.publicKey,
        secret_key_hash: keyPair.secretKeyHash,
        webhook_secret: keyPair.webhookSecret,
        updated_at: new Date().toISOString()
      });
    }

    if (db && merchantId) {
      const nowServer = admin.firestore.FieldValue.serverTimestamp();
      await db.collection('merchants').doc(merchantId).set({
        merchant_id: merchantId,
        business_name: businessName || 'NANASORE TECHNOLOGIES',
        status: 'ACTIVE',
        nanaswitch_keys: {
          public_key: keyPair.publicKey,
          secret_key_hash: keyPair.secretKeyHash,
          generated_at: nowServer,
          mode
        },
        webhook_config: {
          url: targetWebhookUrl,
          secret_key: keyPair.webhookSecret,
          is_active: true
        },
        updated_at: nowServer
      }, { merge: true });
    }

    return res.status(201).json({
      success: true,
      merchant_id: merchantId,
      public_key: keyPair.publicKey,
      secret_key: keyPair.secretKey,
      webhook_secret: keyPair.webhookSecret,
      webhook_config: {
        url: targetWebhookUrl,
        secret_key: keyPair.webhookSecret,
        is_active: true
      },
      message: 'Paire de clés NanaSwitch et secret Webhook générés avec succès.',
      warning: 'Conservez précieusement votre clé secrète (secret_key) et votre secret webhook (webhook_secret). Par mesure de sécurité Zero-Trust, ils ne pourront plus jamais être réaffichés.'
    });
  } catch (err) {
    console.error('[KEY GENERATION ERROR]', err.message);
    return res.status(500).json({
      success: false,
      error: 'Échec de la génération des clés NanaSwitch',
      details: err.message
    });
  }
});

/**
 * POST /v1/switch/merchant/integration-mode & POST /api/switch/merchant/integration-mode
 * Mise à jour sécurisée du mode d'intégration (AUTH ADMIN OBLIGATOIRE)
 */
app.post(['/v1/switch/merchant/integration-mode', '/api/switch/merchant/integration-mode'], requireInternalAdminAuth, express.json(), async (req, res) => {
  try {
    const { merchantId, mode, customCredentials } = req.body;
    if (!merchantId) {
      return res.status(400).json({ success: false, error: 'merchantId requis' });
    }
    const cleanMode = mode === 'BYOK' ? 'BYOK' : 'AGREGATED';
    const saspayKey = customCredentials?.saspay?.api_key || '';
    const sebpayPk = customCredentials?.sebpay?.public_key || '';
    const sebpaySk = customCredentials?.sebpay?.secret_key || '';

    const sanitizedCredentials = {
      saspay: { api_key: String(saspayKey).replace(/\s+/g, '').trim() },
      sebpay: {
        public_key: String(sebpayPk).trim(),
        secret_key: String(sebpaySk).trim()
      }
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase
        .from('nanaswitch_merchants')
        .update({
          integration_config: { mode: cleanMode, custom_credentials: sanitizedCredentials },
          updated_at: new Date().toISOString()
        })
        .eq('merchant_id', String(merchantId));
    }

    if (db) {
      const nowServer = admin.firestore.FieldValue.serverTimestamp();
      await db.collection('merchants').doc(merchantId).set({
        integration_mode: cleanMode,
        integration_config: {
          mode: cleanMode,
          custom_credentials: sanitizedCredentials
        },
        custom_credentials: sanitizedCredentials,
        updated_at: nowServer
      }, { merge: true });
    }

    return res.json({
      success: true,
      merchantId,
      mode: cleanMode,
      message: `Mode d'intégration mis à jour avec succès (${cleanMode}).`
    });
  } catch (err) {
    console.error('[INTEGRATION MODE UPDATE ERROR]', err.message);
    return res.status(500).json({
      success: false,
      error: 'Échec de la mise à jour du mode d\'intégration',
      details: err.message
    });
  }
});

/**
 * POST /v1/switch/merchant/credits/recharge & POST /api/switch/merchant/credits/recharge
 * Recharge du portefeuille de crédits API SaaS (AUTH ADMIN OBLIGATOIRE)
 */
app.post(['/v1/switch/merchant/credits/recharge', '/api/switch/merchant/credits/recharge'], requireInternalAdminAuth, express.json(), async (req, res) => {
  try {
    const { merchantId, creditsAmount = 5000 } = req.body;
    if (!merchantId) {
      return res.status(400).json({ success: false, error: 'merchantId requis' });
    }
    const creditsToAdd = Number(creditsAmount) || 5000;
    let newBalance = creditsToAdd;

    if (db) {
      const merchantRef = db.collection('merchants').doc(merchantId);
      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(merchantRef);
        const currentData = snap.exists ? snap.data() : {};
        const currentCredits = currentData.api_pricing_config?.api_credits_balance ?? currentData.api_credits_balance ?? 0;
        newBalance = currentCredits + creditsToAdd;

        transaction.set(merchantRef, {
          'api_pricing_config.api_credits_balance': newBalance,
          api_credits_balance: newBalance,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });
    }

    return res.json({
      success: true,
      merchantId,
      creditsAdded: creditsToAdd,
      newBalance,
      message: `${creditsToAdd.toLocaleString()} crédits ajoutés au portefeuille API avec succès.`
    });
  } catch (err) {
    console.error('[CREDITS RECHARGE ERROR]', err.message);
    return res.status(500).json({
      success: false,
      error: 'Échec de la recharge de crédits API',
      details: err.message
    });
  }
});

/**
 * GET /v1/switch/merchant/kyc-limits & GET /api/switch/merchant/kyc-limits
 * Consultation de la consommation mensuelle et des plafonds KYC (Particulier: 1M XOF vs Entreprise: 5M XOF)
 */
app.get(['/v1/switch/merchant/kyc-limits', '/api/switch/merchant/kyc-limits'], async (req, res) => {
  try {
    const merchantId = req.query.merchantId || req.query.merchant_id || 'm_live_bf_001';
    const merchant = await merchantService.resolveMerchant(db, '', merchantId);
    const tier = resolveMerchantKycTier(merchant);
    const maxLimit = getMerchantMonthlyLimit(merchant);
    const currentVolume = await getMerchantMonthlyVolume(db, merchant);
    const percentage = Math.min(100, Number(((currentVolume / maxLimit) * 100).toFixed(1)));

    return res.json({
      success: true,
      merchantId,
      tier,
      description: KYC_LIMITS[tier]?.description || '',
      current_monthly_volume_xof: currentVolume,
      max_monthly_volume_xof: maxLimit,
      remaining_volume_xof: Math.max(0, maxLimit - currentVolume),
      consumption_percentage: percentage,
      status_text: `Volume mensuel actuel : ${currentVolume.toLocaleString('fr-FR')} / ${maxLimit.toLocaleString('fr-FR')} XOF`,
      upgrade_available: tier === 'INDIVIDUAL',
      upgrade_incentive: tier === 'INDIVIDUAL' && percentage >= 80
        ? 'Attention, vous approchez du plafond de 1 000 000 XOF. Passez au compte Entreprise (RCCM & IFU) pour bénéficier de 5 000 000 XOF/mois.'
        : null
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/v1/switch/route', '/api/switch/route'], express.json(), async (req, res) => {
  const startTs = Date.now();
  const txId = `sw_${Math.floor(100000 + Math.random() * 900000)}`;

  // Extraction du jeton d'authentification Cloud
  const authHeader = req.headers['authorization'] || '';
  const apiKeyHeader = req.headers['x-nanaswitch-key'] || '';
  let apiKey = apiKeyHeader;
  if (!apiKey && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.replace('Bearer ', '').trim();
  }
  if (!apiKey && req.body.apiKey) {
    apiKey = req.body.apiKey;
  }

  const {
    amount = 15000,
    currency = 'XOF',
    country = 'BF',
    reference,
    customer = {},
    metadata = {}
  } = req.body;

  const countryUpper = String(country).toUpperCase();
  const ref = reference || `REF-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const tenantIdParam = req.body.tenantId || (apiKey ? apiKey.slice(13, 23) : 'merchant-demo');
  const merchant = await merchantService.resolveMerchant(db, apiKey, tenantIdParam);
  const tenantId = merchant?.merchant_id || tenantIdParam;
  const isLive = apiKey ? apiKey.startsWith('nana_sw_live_') : true;

  console.log(`[NANASWITCH ROUTE] Tx: ${txId} | Tenant: ${tenantId} | Pays: ${countryUpper} | Montant: ${amount} ${currency}`);

  // --------------------------------------------------------------------------
  // ÉTAPE A : VÉRIFICATION RISQUE & PLAFOND MENSUEL KYC (403)
  // --------------------------------------------------------------------------
  const kycLimitCheck = await checkTransactionLimit(db, merchant, amount);
  if (!kycLimitCheck.allowed) {
    return res.status(403).json(kycLimitCheck.errorResponse);
  }

  // --------------------------------------------------------------------------
  // ÉTAPE B : VÉRIFICATION SÉCURITÉ & COUPE-CIRCUIT CRÉDITS (402)
  // --------------------------------------------------------------------------
  const creditCheck = await pricingEngine.verifyAndCheckApiCredits(db, merchant);
  let credits = creditCheck.remainingCredits;
  if (!creditCheck.allowed) {
    const blockedLatency = Date.now() - startTs;
    if (db) {
      db.collection('switch_logs').add({
        txId,
        merchantId: tenantId,
        tenantId,
        country: countryUpper,
        amount,
        currency,
        connector: 'AUCUN',
        status: 'BLOCKED_402',
        latencyMs: blockedLatency,
        isLive,
        error: '402_INSUFFICIENT_CLOUD_CREDITS',
        timestamp: new Date().toISOString()
      }).catch(() => {});
    }

    return res.status(402).json(creditCheck.errorResponse);
  }

  // --------------------------------------------------------------------------
  // ÉTAPE B : SÉLECTION GÉOGRAPHIQUE PAR PAYS & CONNECTEURS
  // --------------------------------------------------------------------------
  let primary = 'sebpay';
  let fallback = 'cinetpay';

  if (db && tenantId) {
    try {
      const rulesDoc = await db.collection('switch_routing_rules').doc(tenantId).get();
      if (rulesDoc.exists) {
        const rulesData = rulesDoc.data();
        const rule = rulesData[countryUpper] || rulesData.rules?.[countryUpper];
        if (rule) {
          primary = rule.primaryConnector || primary;
          fallback = rule.fallbackConnector || fallback;
        }
      } else {
        const defRule = DEFAULT_SWITCH_ROUTING[countryUpper] || DEFAULT_SWITCH_ROUTING.BF;
        primary = defRule.primary;
        fallback = defRule.fallback;
      }
    } catch (rErr) {
      const defRule = DEFAULT_SWITCH_ROUTING[countryUpper] || DEFAULT_SWITCH_ROUTING.BF;
      primary = defRule.primary;
      fallback = defRule.fallback;
    }
  } else {
    const defRule = DEFAULT_SWITCH_ROUTING[countryUpper] || DEFAULT_SWITCH_ROUTING.BF;
    primary = defRule.primary;
    fallback = defRule.fallback;
  }

  // --------------------------------------------------------------------------
  // ÉTAPE C : EXÉCUTION DU ROUTAGE & AUTO-FAILOVER 0MS
  // --------------------------------------------------------------------------
  let chosen = primary;
  let failover = false;
  const isSimulatedFailover = metadata.simulateFailover === true;

  if (isSimulatedFailover) {
    failover = true;
    chosen = fallback;
    console.warn(`[NANASWITCH ROUTE] Failover simulé sur ${fallback}`);
  } else {
    chosen = primary;
  }

  const switchLatency = Math.max(16, Date.now() - startTs);
  const redirectUrl = `https://cloud.nanasore.com/pay/${txId}?ref=${encodeURIComponent(ref)}&c=${countryUpper}&amt=${amount}&cur=${currency}`;

  // --------------------------------------------------------------------------
  // ÉTAPE D : DÉBIT DE CRÉDIT & JOURNALISATION D'AUDIT
  // --------------------------------------------------------------------------
  let newCredits = credits;
  if (db && tenantId) {
    if (isLive && credits > 0) {
      newCredits = Math.max(0, credits - 1);
      db.collection('switch_wallets').doc(tenantId).set({
        credits: admin.firestore.FieldValue.increment(-1),
        totalDispatches: admin.firestore.FieldValue.increment(1),
        lastDispatchAt: new Date().toISOString()
      }, { merge: true }).catch(e => console.warn('[NANASWITCH ROUTE] Update wallet :', e.message));
    }

    db.collection('switch_logs').add({
      txId,
      tenantId,
      country: countryUpper,
      amount,
      currency,
      connector: chosen,
      status: failover ? 'FAILOVER_SUCCESS' : 'SUCCESS_200',
      latencyMs: switchLatency,
      isLive,
      failover,
      fallbackConnector: failover ? fallback : null,
      timestamp: new Date().toISOString(),
      nodeRegion: 'eu-west-1 (Static IP 194.163.148.22)'
    }).catch(e => console.warn('[NANASWITCH ROUTE] Add log :', e.message));
  }

  return res.json({
    success: true,
    transactionId: txId,
    reference: ref,
    amount,
    currency,
    country: countryUpper,
    connector: chosen,
    connectorType: chosen,
    switchLatency,
    failoverOccurred: failover,
    fallbackConnector: failover ? fallback : undefined,
    status: 'COMPLETED',
    redirectUrl,
    message: failover
      ? `Aiguillage réussi avec Auto-Failover vers ${chosen} (${switchLatency}ms)`
      : `Aiguillage optimal via ${chosen} (${switchLatency}ms)`,
    remainingCredits: newCredits
  });
});

// Middleware global de gestion d'erreurs Express
app.use((err, _req, res, _next) => {
  console.error('[PAYMENT SERVICE EXPRESS ERROR]', err?.stack || err?.message || err);
  if (!res.headersSent) {
    res.status(err?.status || 500).json({
      success: false,
      error: 'Erreur interne du service de paiement'
    });
  }
});

// Démarrage du serveur et initialisation WebSocket
const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NaNa Payment Micro-service actif sur le port ${PORT}`);
});
initWebSocketServer(server);

// Gestionnaires globaux de résilience & arrêt gracieux (Docker / Northflank / Render)
process.on('unhandledRejection', (reason) => {
  console.error('[PAYMENT SERVICE UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[PAYMENT SERVICE UNCAUGHT EXCEPTION]', err);
});

function gracefulShutdown(signal) {
  console.log(`[PAYMENT SERVICE] Signal ${signal} reçu, arrêt gracieux en cours...`);
  server.close(() => {
    console.log('[PAYMENT SERVICE] Serveur HTTP fermé proprement.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
module.exports.server = server;

