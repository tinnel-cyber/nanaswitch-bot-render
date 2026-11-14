/**
 * @file smartHaggleController.ts
 * @description Moteur IA de Négociation "Smart Haggle" Wameet (Backend Node.js & Google GenAI Gemini)
 * 
 * Directives de logique métier strictes :
 * 1. Protection des Marges : floorPrice secret jamais transmis au frontend.
 * 2. Prompt Système Gemini avec Règle 1 (< floorPrice), Règle 2 (>= floorPrice), Règle 3 (JSON strict).
 * 3. Gestion WebSocket (event 'submit_haggle_offer' -> io.to(socketId).emit('haggle_response', aiResult)) < 2s.
 * 4. Verrouillage de l'Offre : "Smart Escrow" temporaire 2 minutes (120s) et génération lien de paiement.
 * 5. Haute performance : Cache LRU/TTL, Rate Limiter, Pré-filtrage déterministe, Fallback heuristique 1.8s.
 */

import crypto from 'crypto';
import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

// ============================================================================
// 1. MODÈLE DE DONNÉES DU PRODUIT ET PROTECTION DES MARGES (SÉCURITÉ ABSOLUE)
// ============================================================================

export interface NaNaProduct {
  id: string;
  name: string;
  publicPrice: number;   // Ex: 20000 FCFA (Prix affiché publiquement)
  floorPrice: number;    // Ex: 16000 FCFA (PRIX PLANCHER SECRET — STRICTEMENT INTERNE)
  stock: number;
  currency?: string;
  imageUrl?: string;
  category?: string;
}

/**
 * Type produit sécurisé pour le frontend (Le floorPrice est STRICTEMENT exclu)
 */
export type SafeFrontendProduct = Omit<NaNaProduct, 'floorPrice'>;

/**
 * Filtre cryptographique garantissant que floorPrice ne quitte JAMAIS le serveur
 */
export function sanitizeProductForFrontend(product: NaNaProduct): SafeFrontendProduct {
  const { floorPrice, ...safeProduct } = product;
  return safeProduct;
}

/**
 * Catalogue Produits Nanasore (Base de données interne Nanasore)
 */
export const NANA_PRODUCT_CATALOG: Map<string, NaNaProduct> = new Map([
  [
    'prod_flash_live_1',
    {
      id: 'prod_flash_live_1',
      name: 'Coffret Karité Royal Or Prestige (Édition Limitée)',
      publicPrice: 20000,
      floorPrice: 16000, // Seuil de rentabilité absolu secret
      stock: 5,
      currency: 'FCFA',
      imageUrl: 'https://images.unsplash.com/photo-1608248597359-0e6d526a6c58?w=400&auto=format&fit=crop&q=80',
      category: 'Cosmétique Bio'
    }
  ],
  [
    'prod_flash_live_2',
    {
      id: 'prod_flash_live_2',
      name: 'Robe Wax Royale Soie d’Abidjan',
      publicPrice: 35000,
      floorPrice: 28000, // Seuil de rentabilité absolu secret
      stock: 3,
      currency: 'FCFA',
      imageUrl: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?w=400&auto=format&fit=crop&q=80',
      category: 'Mode & Textile'
    }
  ],
  [
    'prod_flash_live_3',
    {
      id: 'prod_flash_live_3',
      name: 'Pack Écouteurs Sans Fil Pro Bass ANC',
      publicPrice: 15000,
      floorPrice: 11500, // Seuil de rentabilité absolu secret
      stock: 12,
      currency: 'FCFA',
      imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80',
      category: 'High-Tech'
    }
  ]
]);

// ============================================================================
// 2. TYPES DE RÉPONSE ET STRUCTURES DU "SMART HAGGLE"
// ============================================================================

export type HaggleStatus = 'accept' | 'counter' | 'reject';

export interface GeminiHaggleRawOutput {
  status: HaggleStatus;
  aiPrice: number;
  message: string;
}

export interface HaggleResponsePayload {
  status: HaggleStatus;
  aiPrice: number;
  message: string;
  productId: string;
  productName: string;
  publicPrice: number;
  userOffer: number;
  currency: string;
  negotiationId: string;
  offerExpiresAt?: number; // Validité de 2 minutes (120 secondes)
  source: 'gemini' | 'cache' | 'edge_guard' | 'heuristic_fallback';
  latencyMs: number;
}

export interface SmartEscrowRecord {
  escrowId: string;
  negotiationId: string;
  productId: string;
  productName: string;
  agreedPrice: number;
  currency: string;
  buyerId: string;
  buyerPhone: string;
  buyerName: string;
  status: 'locked_temporary' | 'paid' | 'expired' | 'released';
  paymentUrl: string;
  paymentProvider: 'c';
  createdAt: number;
  expiresAt: number; // Expiration stricte : 2 minutes (120 000 ms)
}

// ============================================================================
// 3. CACHE HAUTE PERFORMANCE & RATE LIMITER (ANTI-SATURATION GEMINI)
// ============================================================================

interface CacheEntry {
  data: GeminiHaggleRawOutput;
  timestamp: number;
}
const HAGGLE_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 180_000; // 3 minutes de validité

const USER_RATE_LIMIT = new Map<string, number>();
const RATE_LIMIT_COOLDOWN_MS = 1500; // 1 offre max toutes les 1.5s par client

const SMART_ESCROWS = new Map<string, SmartEscrowRecord>();

let activeGeminiCalls = 0;
const MAX_CONCURRENT_GEMINI_CALLS = 12;

// Nettoyage régulier des Smart Escrows expirés et du cache
setInterval(() => {
  const now = Date.now();

  for (const [key, entry] of HAGGLE_CACHE.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      HAGGLE_CACHE.delete(key);
    }
  }

  for (const [id, escrow] of SMART_ESCROWS.entries()) {
    if (escrow.status === 'locked_temporary' && now > escrow.expiresAt) {
      escrow.status = 'expired';
    }
  }

  for (const [id, lastTime] of USER_RATE_LIMIT.entries()) {
    if (now - lastTime > 10_000) {
      USER_RATE_LIMIT.delete(id);
    }
  }
}, 30_000);

// ============================================================================
// 4. CLIENT GEMINI & TIMEOUT ULTRA-RAPIDE (< 2 SECONDES)
// ============================================================================

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'wameet-smart-haggle-engine',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Fallback algorithmique instantané (< 1ms) en cas de saturation réseau ou quota
 */
function computeAlgorithmicFallback(
  product: NaNaProduct,
  userOffer: number
): GeminiHaggleRawOutput {
  if (userOffer >= product.publicPrice) {
    return {
      status: 'accept',
      aiPrice: userOffer,
      message: 'Marché conclu mon ami ! C’est un grand honneur de faire affaire avec toi !'
    };
  }

  if (userOffer >= product.floorPrice) {
    return {
      status: 'accept',
      aiPrice: userOffer,
      message: 'Tu as la bénédiction du commerce ! Offre acceptée avec grand enthousiasme !'
    };
  }

  // Offre inférieure au prix plancher : contre-offre intelligente juste au-dessus du floor
  const delta = product.publicPrice - product.floorPrice;
  const counterPrice = Math.max(
    product.floorPrice,
    Math.round((product.floorPrice + delta * 0.25) / 500) * 500
  );

  return {
    status: 'counter',
    aiPrice: counterPrice,
    message: `À ${userOffer.toLocaleString('fr-FR')}F c'est compliqué, mais je te le laisse à ${counterPrice.toLocaleString('fr-FR')}F !`
  };
}

// ============================================================================
// 5. FONCTION DU PROMPT SYSTÈME GEMINI : handleHaggleOffer(productId, userOffer)
// ============================================================================

export interface HandleHaggleOptions {
  clientId?: string;      // Identifiant client ou socketId
  buyerName?: string;
  timeoutMs?: number;      // Défaut : 1800 ms (strictement inférieur à 2 secondes)
}

/**
 * Fonction maîtresse : handleHaggleOffer(productId, userOffer)
 * Interroge le modèle Gemini avec un prompt strict et impose la protection des marges
 */
export async function handleHaggleOffer(
  productId: string,
  userOffer: number,
  options: HandleHaggleOptions = {}
): Promise<HaggleResponsePayload> {
  const startTime = Date.now();
  const { clientId = 'anonymous', timeoutMs = 1800 } = options;

  // 1. Récupération du produit dans la base de données Nanasore
  const product = NANA_PRODUCT_CATALOG.get(productId);
  if (!product) {
    throw new Error(`Produit introuvable (ID: ${productId})`);
  }

  const negotiationId = `haggle_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = Date.now();

  // 2. Anti-Spam Rate Limiter par Client (1.5 seconde d'intervalle)
  const lastRequest = USER_RATE_LIMIT.get(clientId);
  if (lastRequest && now - lastRequest < RATE_LIMIT_COOLDOWN_MS) {
    const safeCounter = Math.max(product.floorPrice, Math.round(((userOffer + product.publicPrice) / 2) / 500) * 500);
    return {
      status: 'counter',
      aiPrice: safeCounter,
      message: 'Doucement mon ami, laisse le vendeur réfléchir ! Regarde plutôt ma contre-offre.',
      productId: product.id,
      productName: product.name,
      publicPrice: product.publicPrice,
      userOffer,
      currency: product.currency || 'FCFA',
      negotiationId,
      offerExpiresAt: Date.now() + 120_000,
      source: 'edge_guard',
      latencyMs: Date.now() - startTime
    };
  }
  USER_RATE_LIMIT.set(clientId, now);

  // 3. Garde-fous Déterministes d'Exécution Rapide (Zéro appel LLM inutile)
  // Cas A : L'offre est déjà supérieure ou égale au prix public
  if (userOffer >= product.publicPrice) {
    return {
      status: 'accept',
      aiPrice: userOffer,
      message: 'Marché conclu tout de suite ! C’est un honneur de traiter avec toi !',
      productId: product.id,
      productName: product.name,
      publicPrice: product.publicPrice,
      userOffer,
      currency: product.currency || 'FCFA',
      negotiationId,
      offerExpiresAt: Date.now() + 120_000,
      source: 'edge_guard',
      latencyMs: Date.now() - startTime
    };
  }

  // Cas B : Offre dérisoire (inférieure à 35% du plancher secret) -> Rejet instantané poli
  if (userOffer < product.floorPrice * 0.35) {
    const floorPropose = Math.max(product.floorPrice, Math.round((product.floorPrice * 1.05) / 500) * 500);
    return {
      status: 'counter',
      aiPrice: floorPropose,
      message: `Ah mon cher, à ${userOffer.toLocaleString('fr-FR')}F tu veux m'envoyer au village ! Le dernier geste c'est ${floorPropose.toLocaleString('fr-FR')}F.`,
      productId: product.id,
      productName: product.name,
      publicPrice: product.publicPrice,
      userOffer,
      currency: product.currency || 'FCFA',
      negotiationId,
      offerExpiresAt: Date.now() + 120_000,
      source: 'edge_guard',
      latencyMs: Date.now() - startTime
    };
  }

  // 4. Vérification dans le Cache Mémoire LRU/TTL
  const cacheKey = `${productId}:${userOffer}`;
  const cached = HAGGLE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    const safeAiPrice = Math.max(product.floorPrice, cached.data.aiPrice);
    const safeStatus = safeAiPrice < product.floorPrice ? 'counter' : cached.data.status;

    return {
      status: safeStatus,
      aiPrice: safeAiPrice,
      message: cached.data.message,
      productId: product.id,
      productName: product.name,
      publicPrice: product.publicPrice,
      userOffer,
      currency: product.currency || 'FCFA',
      negotiationId,
      offerExpiresAt: Date.now() + 120_000,
      source: 'cache',
      latencyMs: Date.now() - startTime
    };
  }

  // 5. Coupe-Circuit Concurrence : Si trop de requêtes simultanées, fallback heuristique instantané
  const ai = getGeminiClient();
  if (!ai || activeGeminiCalls >= MAX_CONCURRENT_GEMINI_CALLS) {
    const fallback = computeAlgorithmicFallback(product, userOffer);
    return {
      status: fallback.status,
      aiPrice: Math.max(product.floorPrice, fallback.aiPrice),
      message: fallback.message,
      productId: product.id,
      productName: product.name,
      publicPrice: product.publicPrice,
      userOffer,
      currency: product.currency || 'FCFA',
      negotiationId,
      offerExpiresAt: Date.now() + 120_000,
      source: 'heuristic_fallback',
      latencyMs: Date.now() - startTime
    };
  }

  // 6. Formulation du Prompt Système Gemini Strict au mot près
  const systemPrompt = `Tu es un vendeur commerçant africain chaleureux mais redoutable en affaires. Le prix public est ${product.publicPrice}. Le client propose ${userOffer}. Ton seuil de rentabilité absolu est ${product.floorPrice}. Règle 1 : Si l'offre est < ${product.floorPrice}, refuse poliment ou propose un prix juste au-dessus du floor. Règle 2 : Si l'offre est >= ${product.floorPrice}, accepte avec enthousiasme. Règle 3 : Réponds uniquement au format JSON : { "status": "accept" | "counter" | "reject", "aiPrice": number, "message": "texte court et vendeur" }.`;

  activeGeminiCalls++;

  try {
    // Exécution avec timeout strict < 2s (1800ms)
    const geminiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_GEMINI_EXCEEDED')), timeoutMs)
    );

    const response = await Promise.race([geminiPromise, timeoutPromise]);
    const rawText = response.text || '';

    // Décodage du JSON
    const parsed: GeminiHaggleRawOutput = JSON.parse(rawText);

    // =========================================================================
    // GARDE DU CORPS ALGORITHMIQUE : SÉCURITÉ ABSOLUE DES MARGES (ZERO LOSS)
    // Même en cas d'hallucination ou d'injection du modèle, le code impose :
    // =========================================================================
    if (parsed.status === 'accept' && userOffer < product.floorPrice) {
      parsed.status = 'counter';
      parsed.aiPrice = Math.max(
        product.floorPrice,
        Math.round(((userOffer + product.publicPrice) / 2) / 500) * 500
      );
      parsed.message = `À ${userOffer.toLocaleString('fr-FR')}F c'est compliqué, mais je te le laisse à ${parsed.aiPrice.toLocaleString('fr-FR')}F !`;
    }

    if (parsed.aiPrice < product.floorPrice) {
      parsed.aiPrice = product.floorPrice;
      if (parsed.status === 'accept' && userOffer < product.floorPrice) {
        parsed.status = 'counter';
      }
    }

    // Mise en cache
    HAGGLE_CACHE.set(cacheKey, {
      data: parsed,
      timestamp: Date.now()
    });

    return {
      status: parsed.status,
      aiPrice: parsed.aiPrice,
      message: parsed.message,
      productId: product.id,
      productName: product.name,
      publicPrice: product.publicPrice,
      userOffer,
      currency: product.currency || 'FCFA',
      negotiationId,
      offerExpiresAt: Date.now() + 120_000,
      source: 'gemini',
      latencyMs: Date.now() - startTime
    };
  } catch (err: any) {
    console.warn(`[SMART HAGGLE] Fallback heuristique activé (${err.message}) en ${Date.now() - startTime}ms`);
    const fallback = computeAlgorithmicFallback(product, userOffer);

    return {
      status: fallback.status,
      aiPrice: Math.max(product.floorPrice, fallback.aiPrice),
      message: fallback.message,
      productId: product.id,
      productName: product.name,
      publicPrice: product.publicPrice,
      userOffer,
      currency: product.currency || 'FCFA',
      negotiationId,
      offerExpiresAt: Date.now() + 120_000,
      source: 'heuristic_fallback',
      latencyMs: Date.now() - startTime
    };
  } finally {
    activeGeminiCalls = Math.max(0, activeGeminiCalls - 1);
  }
}

// ============================================================================
// 6. VERROUILLAGE DE L'OFFRE & SMART ESCROW SÉCURISÉ (2 MINUTES)
// ============================================================================

export interface LockEscrowParams {
  productId: string;
  agreedPrice: number;
  negotiationId?: string;
  buyerId?: string;
  buyerPhone?: string;
  buyerName?: string;
}

export interface LockEscrowResult {
  success: boolean;
  escrowId: string;
  agreedPrice: number;
  currency: string;
  expiresAt: number;
  remainingSeconds: number;
  paymentUrl: string;
  error?: string;
}

/**
 * Génère le lien de paiement C-Pay V2 pour le Smart Escrow
 */
async function generateCPaymentUrl(
  escrowId: string,
  amount: number,
  productName: string,
  buyerPhone: string,
  buyerName: string
): Promise<string> {
  const cApiKey = process.env.C_API_KEY;
  const cSiteId = process.env.C_SITE_ID;

  if (cApiKey && cSiteId) {
    try {
      const payload = {
        apikey: cApiKey,
        site_id: cSiteId,
        transaction_id: escrowId,
        amount,
        currency: 'XOF',
        description: `Wameet Smart Haggle : ${productName}`,
        return_url: `https://wameet.africa/live/payment-success?escrowId=${escrowId}`,
        notify_url: `https://nana-payment-api.onrender.com/api/webhooks/cinetpay`,
        customer_name: buyerName || 'Acheteur Wameet',
        customer_surname: 'Client',
        customer_phone_number: buyerPhone || '+2250700000000',
        customer_email: 'paiement@wameet.africa',
        customer_address: 'Plateau',
        customer_city: 'Abidjan',
        customer_country: 'CI',
        customer_state: 'CI',
        customer_zip_code: '00225'
      };

      const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data: any = await response.json();
      if (data && data.code === '201' && data.data?.payment_url) {
        return data.data.payment_url;
      }
    } catch (cErr) {
      console.error('[C API ERROR]', cErr);
    }
  }

  // Passerelle de secours standardisée Sandbox / NaNa Switch
  return `https://checkout.cinetpay.com/payment/${escrowId}?amount=${amount}&currency=XOF&title=${encodeURIComponent(
    productName
  )}&desc=WameetSmartHaggle&site_id=${cSiteId || 'sandbox_wameet'}`;
}

/**
 * Verrouille l'offre dans un Smart Escrow temporaire de 2 minutes
 */
export async function lockHaggleEscrow(
  params: LockEscrowParams
): Promise<LockEscrowResult> {
  const {
    productId,
    agreedPrice,
    negotiationId = `neg_${Date.now()}`,
    buyerId = 'client_wameet_buyer',
    buyerPhone = '+2250700000000',
    buyerName = 'Acheteur Direct'
  } = params;

  // 1. Contrôle de validité du produit et rentabilité absolue
  const product = NANA_PRODUCT_CATALOG.get(productId);
  if (!product) {
    throw new Error(`Produit introuvable (${productId})`);
  }

  // VÉRIFICATION DE SÉCURITÉ INVIOLABLE : agreedPrice ne peut JAMAIS être < floorPrice
  if (agreedPrice < product.floorPrice) {
    throw new Error(
      `Violation de rentabilité : Le prix proposé (${agreedPrice} FCFA) est inférieur au prix plancher de rentabilité.`
    );
  }

  const escrowId = `escrow_haggle_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = Date.now();
  const expiresAt = now + 120_000; // Valable strictement 2 minutes (120 secondes)

  // 2. Génération du lien de paiement sécurisé
  const paymentUrl = await generateCPaymentUrl(
    escrowId,
    agreedPrice,
    product.name,
    buyerPhone,
    buyerName
  );

  // 3. Enregistrement du Smart Escrow
  const escrowRecord: SmartEscrowRecord = {
    escrowId,
    negotiationId,
    productId,
    productName: product.name,
    agreedPrice,
    currency: product.currency || 'FCFA',
    buyerId,
    buyerPhone,
    buyerName,
    status: 'locked_temporary',
    paymentUrl,
    paymentProvider: 'c',
    createdAt: now,
    expiresAt
  };

  SMART_ESCROWS.set(escrowId, escrowRecord);

  console.log(
    `[SMART ESCROW VERROUILLÉ] Tx: ${escrowId} | Produit: ${product.name} | Prix: ${agreedPrice} FCFA | Expire dans 120s`
  );

  return {
    success: true,
    escrowId,
    agreedPrice,
    currency: product.currency || 'FCFA',
    expiresAt,
    remainingSeconds: 120,
    paymentUrl
  };
}

// ============================================================================
// 7. GESTIONNAIRE WEBSOCKET COMPLET (io.to(socketId).emit(...) & NATIVE WS)
// ============================================================================

export interface SocketEventEmitter {
  to: (socketId: string) => {
    emit: (event: string, data: any) => void;
  };
  emit: (event: string, data: any) => void;
}

/**
 * Configure les gestionnaires WebSocket pour Socket.io ou serveur WebSocket natif
 * Directives :
 * - Event entrant : 'submit_haggle_offer'
 * - Event sortant : io.to(socketId).emit('haggle_response', aiResult)
 * - Event accord  : 'accept_haggle_offer' -> io.to(socketId).emit('haggle_escrow_locked', escrowResult)
 */
export function registerSmartHaggleSocket(io: any): void {
  if (!io) return;

  // Support Socket.io standard
  if (typeof io.on === 'function') {
    io.on('connection', (socket: any) => {
      console.log(`[SMART HAGGLE WS] Spectateur connecté : ${socket.id}`);

      // 1. Événement 'submit_haggle_offer'
      socket.on('submit_haggle_offer', async (data: {
        productId: string;
        userOffer: number;
        buyerName?: string;
      }) => {
        try {
          const { productId, userOffer, buyerName } = data || {};
          if (!productId || typeof userOffer !== 'number') {
            io.to(socket.id).emit('haggle_error', { message: 'Données d’offre invalides.' });
            return;
          }

          // Appel de l'IA (garanti sous 2 secondes)
          const aiResult = await handleHaggleOffer(productId, userOffer, {
            clientId: socket.id,
            buyerName
          });

          // Renvoi de la réponse via io.to(socketId).emit('haggle_response', aiResult)
          io.to(socket.id).emit('haggle_response', aiResult);
        } catch (err: any) {
          console.error('[SMART HAGGLE WS ERROR]', err);
          io.to(socket.id).emit('haggle_error', { message: err.message || 'Erreur interne de négociation.' });
        }
      });

      // 2. Événement 'accept_haggle_offer' -> Verrouillage Smart Escrow + Paiement
      socket.on('accept_haggle_offer', async (data: LockEscrowParams) => {
        try {
          const escrowResult = await lockHaggleEscrow({
            ...data,
            buyerId: data.buyerId || socket.id
          });

          // Renvoi du lien de paiement et du Smart Escrow temporaire
          io.to(socket.id).emit('haggle_escrow_locked', escrowResult);
        } catch (err: any) {
          console.error('[SMART HAGGLE ESCROW ERROR]', err);
          io.to(socket.id).emit('haggle_escrow_error', {
            message: err.message || 'Impossible de verrouiller l’offre.'
          });
        }
      });
    });
  }
}

// ============================================================================
// 8. MIDDLEWARE & ENDPOINTS REST EXPRESS (FALLBACK HTTP ROBUSTE)
// ============================================================================

export function attachSmartHaggleRoutes(app: any): void {
  /**
   * GET /api/haggle/products
   * Liste les produits disponibles avec masquage total et inviolable du floorPrice
   */
  app.get('/api/haggle/products', (_req: Request, res: Response) => {
    const safeProducts = Array.from(NANA_PRODUCT_CATALOG.values()).map(sanitizeProductForFrontend);
    res.json({ success: true, products: safeProducts });
  });

  /**
   * GET /api/haggle/product/:id
   * Récupère un produit avec masquage total du floorPrice
   */
  app.get('/api/haggle/product/:id', (req: Request, res: Response) => {
    const product = NANA_PRODUCT_CATALOG.get(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Produit introuvable.' });
    }
    res.json({ success: true, product: sanitizeProductForFrontend(product) });
  });

  /**
   * POST /api/haggle/offer
   * Endpoint HTTP direct pour négocier avec Gemini (< 2s)
   */
  app.post('/api/haggle/offer', async (req: Request, res: Response) => {
    try {
      const { productId, userOffer, buyerName } = req.body || {};
      if (!productId || typeof userOffer !== 'number') {
        return res.status(400).json({ success: false, error: 'Paramètres manquants : productId et userOffer requis.' });
      }

      const clientId = (req.headers['x-client-id'] as string) || req.ip || 'http_client';
      const aiResult = await handleHaggleOffer(productId, userOffer, { clientId, buyerName });

      res.json({ success: true, ...aiResult });
    } catch (err: any) {
      console.error('[API HAGGLE OFFER ERROR]', err);
      res.status(500).json({ success: false, error: err.message || 'Erreur interne négociation IA.' });
    }
  });

  /**
   * POST /api/haggle/accept-escrow
   * Endpoint HTTP direct pour verrouiller le Smart Escrow et générer le lien de paiement
   */
  app.post('/api/haggle/accept-escrow', async (req: Request, res: Response) => {
    try {
      const { productId, agreedPrice, buyerPhone, buyerName, buyerId, negotiationId } = req.body || {};
      if (!productId || typeof agreedPrice !== 'number') {
        return res.status(400).json({ success: false, error: 'Paramètres manquants : productId et agreedPrice requis.' });
      }

      const escrowResult = await lockHaggleEscrow({
        productId,
        agreedPrice,
        negotiationId,
        buyerId: buyerId || 'http_buyer',
        buyerPhone: buyerPhone || '+2250700000000',
        buyerName: buyerName || 'Acheteur Web'
      });

      res.json(escrowResult);
    } catch (err: any) {
      console.error('[API HAGGLE ESCROW ERROR]', err);
      res.status(400).json({ success: false, error: err.message || 'Impossible de verrouiller le Smart Escrow.' });
    }
  });
}
