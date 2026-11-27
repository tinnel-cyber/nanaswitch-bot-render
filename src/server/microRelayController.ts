/**
 * @file microRelayController.ts
 * @description Moteur Backend "Micro-Relais" et Split de Paiement avec S (Node.js)
 * 
 * Directives d'architecture et logique métier (Prompt 15) :
 * 1. Traçabilité du Lien (GET /api/live/join) :
 *    - Si l'URL contient ?ref=affiliateId, stocke cet affiliateId dans la session WebSocket ou panier temporaire.
 * 2. Paiement et Répartition (POST /api/checkout/s) :
 *    - L'acheteur paie le montant total (ex: 15 000 FCFA) via s-client.
 * 3. Logique de Split dans le Webhook de confirmation :
 *    - Si ref présent : Calcul de commission (5%). Vendeur = 95% (14 250 FCFA), Affilié = 5% (750 FCFA).
 * 4. Transactions ACID obligatoires pour la mise à jour des portefeuilles.
 * 5. Signaux WebSockets ciblés :
 *    - io.to(sellerId).emit('sale_completed', { amount: 14250 })
 *    - io.to(affiliateId).emit('commission_earned', { amount: 750 }) -> déclenche CommissionToast !
 */

import crypto from 'crypto';
import type { Request, Response, Express } from 'express';
import sClient from './sebpay-client';
import { emitNewOrderPing } from './swarmLogisticsController';

// ============================================================================
// 1. TYPES & INTERFACES DU MOTEUR MICRO-RELAIS
// ============================================================================

export interface AffiliateSessionData {
  buyerId: string;
  liveId: string;
  affiliateId: string;
  socketId?: string;
  trackedAt: number;
  metadata?: Record<string, any>;
}

export interface SCheckoutPayload {
  buyerId: string;
  buyerPhone: string;
  buyerName?: string;
  sellerId: string;
  liveId: string;
  productId: string;
  productName?: string;
  amount: number;             // Ex: 15 000 FCFA
  currency?: string;          // Par défaut 'FCFA' / 'XOF'
  ref?: string;               // affiliateId transmis directement ou extrait de la session
  commissionRate?: number;    // Par défaut 5% (0.05)
}

export interface SOrderRecord {
  orderId: string;
  transactionId: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  sellerId: string;
  affiliateId: string | null;
  liveId: string;
  productId: string;
  productName: string;
  totalAmount: number;        // Ex: 15 000 FCFA
  sellerAmount: number;       // Ex: 14 250 FCFA (si 5% split)
  commissionAmount: number;   // Ex: 750 FCFA (si 5% split)
  commissionRate: number;     // 5%
  currency: string;
  paymentStatus: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';
  splitExecuted: boolean;
  createdAt: number;
  confirmedAt?: number;
}

export interface AcidTransactionAudit {
  transactionId: string;
  orderId: string;
  sellerId: string;
  sellerAmount: number;
  affiliateId: string | null;
  commissionAmount: number;
  sellerWalletBefore: number;
  sellerWalletAfter: number;
  affiliateWalletBefore?: number;
  affiliateWalletAfter?: number;
  status: 'STARTED' | 'COMMITTED' | 'ROLLED_BACK';
  timestamp: number;
  error?: string;
}

export interface WebSocketBroadcaster {
  to: (targetId: string) => {
    emit: (event: string, data: any) => void;
  };
  emit: (event: string, data: any) => void;
}

// ============================================================================
// 2. REGISTRES EN MÉMOIRE & SYSTÈME TRANSACTIONNEL ACID
// ============================================================================

// Traçabilité des affiliations des acheteurs : Map<buyerKey, AffiliateSessionData>
const AFFILIATE_ATTRIBUTION_REGISTRY = new Map<string, AffiliateSessionData>();

// Registre des commandes en attente ou finalisées : Map<transactionId, SOrderRecord>
const S_ORDERS_REGISTRY = new Map<string, SOrderRecord>();

// Journal d'audit des transactions ACID pour traçabilité et rollback garanti
const ACID_AUDIT_LOGS: AcidTransactionAudit[] = [];

// Verrous d'exclusion mutuelle par Wallet (Atomic Mutex) pour éliminer les race conditions
const WALLET_MUTEXES = new Set<string>();

// Mapping Socket <-> Utilisateur (pour router io.to(userId) vers les bons sockets)
const USER_CONNECTED_SOCKETS = new Map<string, Set<string>>();

// Émetteur WebSocket global
let globalSocketEmitter: WebSocketBroadcaster | null = null;

export function setMicroRelaySocketEmitter(io: WebSocketBroadcaster): void {
  globalSocketEmitter = io;
}

/**
 * Enregistre la correspondance entre un ID utilisateur (affilié ou vendeur) et son socket
 */
export function registerUserSocket(userId: string, socketId: string): void {
  if (!USER_CONNECTED_SOCKETS.has(userId)) {
    USER_CONNECTED_SOCKETS.set(userId, new Set());
  }
  USER_CONNECTED_SOCKETS.get(userId)!.add(socketId);
  console.log(`[MICRO-RELAIS WS] Utilisateur ${userId} associé au socket ${socketId}`);
}

/**
 * Retire un socket lors de sa déconnexion
 */
export function unregisterUserSocket(socketId: string): void {
  for (const [userId, sockets] of USER_CONNECTED_SOCKETS.entries()) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      USER_CONNECTED_SOCKETS.delete(userId);
    }
  }
}

// ============================================================================
// 3. MOTEUR TRANSACTIONNEL ACID (ACID ENGINE AVEC ROLLBACK)
// ============================================================================

/**
 * Acquiert un verrou exclusif sur un portefeuille
 */
async function acquireWalletLock(walletId: string, maxWaitMs = 3000): Promise<boolean> {
  const startTime = Date.now();
  while (WALLET_MUTEXES.has(walletId)) {
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error(`[ACID LOCK TIMEOUT] Impossible d'acquérir le verrou pour ${walletId}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  WALLET_MUTEXES.add(walletId);
  return true;
}

/**
 * Libère le verrou exclusif sur un portefeuille
 */
function releaseWalletLock(walletId: string): void {
  WALLET_MUTEXES.delete(walletId);
}

/**
 * Exécute le split financier avec garantie transactionnelle ACID stricte :
 * - Atomicité : Le vendeur et l'affilié sont crédités ensemble, ou aucun ne l'est.
 * - Cohérence : La somme sellerAmount + commissionAmount est strictement égale à totalAmount.
 * - Isolation : Verrous mutuels exclusifs par compte portefeuille.
 * - Durabilité : Journal d'audit complet en mémoire et persistance S.
 */
async function executeAcidSplitTransaction(params: {
  transactionId: string;
  orderId: string;
  sellerId: string;
  sellerAmount: number;
  affiliateId: string | null;
  commissionAmount: number;
  totalAmount: number;
}): Promise<AcidTransactionAudit> {
  const {
    transactionId,
    orderId,
    sellerId,
    sellerAmount,
    affiliateId,
    commissionAmount,
    totalAmount
  } = params;

  // 1. Validation de cohérence mathématique stricte
  if (sellerAmount + commissionAmount !== totalAmount) {
    throw new Error(
      `[ACID COHÉRENCE] Incohérence des montants : ${sellerAmount} + ${commissionAmount} != ${totalAmount}`
    );
  }

  const auditEntry: AcidTransactionAudit = {
    transactionId,
    orderId,
    sellerId,
    sellerAmount,
    affiliateId,
    commissionAmount,
    sellerWalletBefore: 0,
    sellerWalletAfter: 0,
    status: 'STARTED',
    timestamp: Date.now()
  };

  const sellerWalletKey = `wallet_${sellerId}`;
  const affiliateWalletKey = affiliateId ? `wallet_${affiliateId}` : null;

  // 2. Acquisition des verrous exclusifs (Isolation)
  await acquireWalletLock(sellerWalletKey);
  if (affiliateWalletKey) {
    await acquireWalletLock(affiliateWalletKey);
  }

  let sellerCredited = false;
  let affiliateCredited = false;

  try {
    // 3. Étape A : Crédit du Wallet Vendeur (ex: 14 250 FCFA)
    const sellerTx = await sClient.creditWameetWallet(
      sellerId,
      sellerAmount,
      `Vente Live Micro-Relais (Tx: ${transactionId} - Commande ${orderId})`
    );
    auditEntry.sellerWalletAfter = sellerTx.balance;
    auditEntry.sellerWalletBefore = sellerTx.balance - sellerAmount;
    sellerCredited = true;

    // 4. Étape B : Crédit du Wallet Affilié si présent (ex: 750 FCFA)
    if (affiliateId && commissionAmount > 0) {
      const affiliateTx = await sClient.creditWameetWallet(
        affiliateId,
        commissionAmount,
        `Commission Micro-Relais 5% (Tx: ${transactionId} - Commande ${orderId})`
      );
      auditEntry.affiliateWalletAfter = affiliateTx.balance;
      auditEntry.affiliateWalletBefore = affiliateTx.balance - commissionAmount;
      affiliateCredited = true;
    }

    // 5. Validation de la transaction (COMMIT)
    auditEntry.status = 'COMMITTED';
    ACID_AUDIT_LOGS.push(auditEntry);

    console.log(
      `[ACID TRANSACTION COMMIT] Succès Tx: ${transactionId} | Vendeur (${sellerId}): +${sellerAmount} FCFA | Affilié (${affiliateId || 'aucun'}): +${commissionAmount} FCFA`
    );

    return auditEntry;
  } catch (err: any) {
    // 6. Gestion d'échec & ROLLBACK atomique
    console.error(`[ACID TRANSACTION ERROR] Échec de la transaction ${transactionId} :`, err);
    auditEntry.status = 'ROLLED_BACK';
    auditEntry.error = err.message || 'Erreur exécution ACID';

    // Rollback compensatoire si le vendeur avait été crédité avant l'échec de l'affilié
    if (sellerCredited) {
      try {
        console.warn(`[ACID ROLLBACK] Annulation du crédit vendeur (${sellerAmount} FCFA)...`);
        await sClient.creditWameetWallet(
          sellerId,
          -sellerAmount,
          `COMPENSATION ROLLBACK Tx: ${transactionId}`
        );
      } catch (rollbackErr) {
        console.error('[ACID CRITICAL ROLLBACK FAILURE]', rollbackErr);
      }
    }

    if (affiliateCredited && affiliateId) {
      try {
        await sClient.creditWameetWallet(
          affiliateId,
          -commissionAmount,
          `COMPENSATION ROLLBACK Tx: ${transactionId}`
        );
      } catch (rollbackErr) {
        console.error('[ACID CRITICAL ROLLBACK FAILURE]', rollbackErr);
      }
    }

    ACID_AUDIT_LOGS.push(auditEntry);
    throw err;
  } finally {
    // 7. Libération obligatoire des verrous
    releaseWalletLock(sellerWalletKey);
    if (affiliateWalletKey) {
      releaseWalletLock(affiliateWalletKey);
    }
  }
}

// ============================================================================
// 4. ÉMISSION INTELLIGENTE DES SIGNAUX WEBSOCKET (SOCKET ADAPTER)
// ============================================================================

/**
 * Envoie un événement WebSocket à une cible (userId, socketId ou room)
 */
function emitToTarget(targetId: string, event: string, payload: any): void {
  if (!globalSocketEmitter) {
    console.warn(`[MICRO-RELAIS WS] Pas d'émetteur WebSocket actif pour émettre "${event}" à ${targetId}`);
    return;
  }

  // 1. Émission directe via l'adapter io.to(targetId)
  try {
    globalSocketEmitter.to(targetId).emit(event, payload);
  } catch (err) {
    console.warn(`[MICRO-RELAIS WS] Échec émission directe à ${targetId} :`, err);
  }

  // 2. Si targetId est un userId, broadcast également aux sockets associés répertoriés
  const userSockets = USER_CONNECTED_SOCKETS.get(targetId);
  if (userSockets && userSockets.size > 0) {
    for (const socketId of userSockets) {
      try {
        globalSocketEmitter.to(socketId).emit(event, payload);
      } catch {}
    }
  }
}

// ============================================================================
// 5. FONCTIONS MÉTIER DU CONTRÔLEUR
// ============================================================================

/**
 * 1. Traçabilité du Lien (GET /api/live/join)
 * Quand un utilisateur rejoint un Live, si l'URL contient un paramètre ?ref=affiliateId,
 * stocke cet affiliateId dans la session WebSocket ou le panier temporaire.
 */
export function trackLiveAffiliateJoin(params: {
  liveId: string;
  userId?: string;
  socketId?: string;
  ref?: string;
  metadata?: Record<string, any>;
}): {
  success: boolean;
  liveId: string;
  trackedAffiliateId: string | null;
  hasAffiliate: boolean;
  message: string;
} {
  const { liveId, userId = 'anon_viewer', socketId, ref, metadata } = params;

  if (!ref || ref.trim() === '') {
    return {
      success: true,
      liveId,
      trackedAffiliateId: null,
      hasAffiliate: false,
      message: 'Spectateur connecté sans parrainage Micro-Relais.'
    };
  }

  const cleanAffiliateId = ref.trim();
  const sessionKey = `${liveId}_${userId}`;

  const sessionData: AffiliateSessionData = {
    buyerId: userId,
    liveId,
    affiliateId: cleanAffiliateId,
    socketId,
    trackedAt: Date.now(),
    metadata
  };

  // Stocke dans le registre par clé composite (liveId_userId) et par socketId si fourni
  AFFILIATE_ATTRIBUTION_REGISTRY.set(sessionKey, sessionData);
  if (socketId) {
    AFFILIATE_ATTRIBUTION_REGISTRY.set(`socket_${socketId}`, sessionData);
    registerUserSocket(userId, socketId);
  }

  console.log(
    `[MICRO-RELAIS TRACKING] Acheteur ${userId} affilié à ${cleanAffiliateId} pour le Live ${liveId}`
  );

  return {
    success: true,
    liveId,
    trackedAffiliateId: cleanAffiliateId,
    hasAffiliate: true,
    message: `Lien d'affiliation Micro-Relais (${cleanAffiliateId}) rattaché avec succès.`
  };
}

/**
 * 2. Initialisation de Paiement S (POST /api/checkout/s)
 * L'acheteur paie le montant total (ex: 15 000 FCFA) via notre client local ./s-client.
 */
export async function initiateSCheckout(payload: SCheckoutPayload) {
  const {
    buyerId,
    buyerPhone,
    buyerName = 'Acheteur Live',
    sellerId,
    liveId,
    productId,
    productName = 'Article Flash Live',
    amount,
    currency = 'FCFA',
    ref,
    commissionRate = 0.05 // 5%
  } = payload;

  if (!amount || amount <= 0) {
    throw new Error('Le montant de paiement est invalide.');
  }

  // Résolution de l'affiliateId : soit passé directement, soit recherché dans la session
  let resolvedAffiliateId: string | null = ref || null;
  if (!resolvedAffiliateId) {
    const sessionKey = `${liveId}_${buyerId}`;
    const trackedSession = AFFILIATE_ATTRIBUTION_REGISTRY.get(sessionKey);
    if (trackedSession && trackedSession.affiliateId) {
      resolvedAffiliateId = trackedSession.affiliateId;
    }
  }

  // Évite qu'un vendeur ou un acheteur ne s'auto-parraine
  if (resolvedAffiliateId === buyerId || resolvedAffiliateId === sellerId) {
    console.info('[MICRO-RELAIS] Auto-parrainage détecté et neutralisé.');
    resolvedAffiliateId = null;
  }

  const orderId = `ord_s_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const totalAmount = Math.round(amount);

  // Calcul du split préliminaire
  let commissionAmount = 0;
  let sellerAmount = totalAmount;

  if (resolvedAffiliateId) {
    commissionAmount = Math.round(totalAmount * commissionRate); // Ex: 15 000 * 5% = 750 FCFA
    sellerAmount = totalAmount - commissionAmount;               // Ex: 14 250 FCFA
  }

  // 1. Initialisation de la transaction avec S Client local
  const escrowRes = await sClient.createEscrowPayment({
    amount: totalAmount,
    currency,
    description: `Achat Live Micro-Relais: ${productName}`,
    customerPhone: buyerPhone,
    customerName: buyerName,
    buyerId,
    metadata: {
      orderId,
      liveId,
      productId,
      sellerId,
      affiliateId: resolvedAffiliateId,
      commissionRate,
      commissionAmount,
      sellerAmount
    }
  });

  const transactionId = escrowRes.transactionId;

  // 2. Sauvegarde de la commande dans le registre
  const orderRecord: SOrderRecord = {
    orderId,
    transactionId,
    buyerId,
    buyerName,
    buyerPhone,
    sellerId,
    affiliateId: resolvedAffiliateId,
    liveId,
    productId,
    productName,
    totalAmount,
    sellerAmount,
    commissionAmount,
    commissionRate: commissionRate * 100,
    currency,
    paymentStatus: 'PENDING',
    splitExecuted: false,
    createdAt: Date.now()
  };

  S_ORDERS_REGISTRY.set(transactionId, orderRecord);
  S_ORDERS_REGISTRY.set(orderId, orderRecord);

  console.log(
    `[MICRO-RELAIS CHECKOUT] Commande ${orderId} initialisée pour ${totalAmount} ${currency} (Tx: ${transactionId}) | Split prévu: Vendeur ${sellerAmount} / Affilié ${commissionAmount}`
  );

  return {
    success: true,
    orderId,
    transactionId,
    amount: totalAmount,
    currency,
    paymentUrl: escrowRes.paymentUrl,
    affiliateTracked: Boolean(resolvedAffiliateId),
    affiliateId: resolvedAffiliateId,
    splitPreview: {
      total: totalAmount,
      sellerShare: sellerAmount,
      affiliateCommission: commissionAmount,
      ratePercentage: commissionRate * 100
    }
  };
}

/**
 * 3. Logique de Split dans le Webhook de confirmation de paiement S
 * - Vérifie la présence du ref / affiliateId
 * - Vendeur : 95% (ex: 14 250 FCFA)
 * - Affilié : 5% (ex: 750 FCFA)
 * - Transactions ACID sur les Wallets
 * - Signaux WebSocket ciblés :
 *   io.to(sellerId).emit('sale_completed', { amount: 14250 })
 *   io.to(affiliateId).emit('commission_earned', { amount: 750 })
 */
export async function handleSPaymentConfirmation(params: {
  transactionId: string;
  receiptNumber?: string;
  status?: string;
}) {
  const { transactionId } = params;
  const order = S_ORDERS_REGISTRY.get(transactionId);

  if (!order) {
    throw new Error(`Commande introuvable pour la transaction S : ${transactionId}`);
  }

  if (order.splitExecuted) {
    console.log(`[MICRO-RELAIS WEBHOOK] Transaction ${transactionId} déjà finalisée.`);
    return { success: true, message: 'Split déjà exécuté', order };
  }

  // 1. Capture définitive auprès de S
  await sClient.captureEscrowPayment(transactionId, order.totalAmount);

  // 2. Exécution du split avec transactions ACID obligatoires
  const auditResult = await executeAcidSplitTransaction({
    transactionId,
    orderId: order.orderId,
    sellerId: order.sellerId,
    sellerAmount: order.sellerAmount,
    affiliateId: order.affiliateId,
    commissionAmount: order.commissionAmount,
    totalAmount: order.totalAmount
  });

  order.paymentStatus = 'CONFIRMED';
  order.splitExecuted = true;
  order.confirmedAt = Date.now();

  // =========================================================================
  // 3. SIGNAUX WEBSOCKETS EN TEMPS RÉEL (Directives Prompt 15)
  // =========================================================================

  // Événement WebSocket au Vendeur : io.to(sellerId).emit('sale_completed', { amount: 14250 })
  emitToTarget(order.sellerId, 'sale_completed', {
    amount: order.sellerAmount,
    totalAmount: order.totalAmount,
    commission: order.commissionAmount,
    currency: order.currency,
    buyerName: order.buyerName,
    productName: order.productName,
    transactionId: order.transactionId,
    orderId: order.orderId,
    liveId: order.liveId,
    timestamp: Date.now()
  });

  // Le signal de récompense à l'Affilié : io.to(affiliateId).emit('commission_earned', { amount: 750 })
  // Ce signal déclenche le CommissionToast sur le frontend !
  if (order.affiliateId && order.commissionAmount > 0) {
    emitToTarget(order.affiliateId, 'commission_earned', {
      amount: order.commissionAmount,
      currency: order.currency,
      totalSaleAmount: order.totalAmount,
      commissionRate: order.commissionRate,
      buyerName: order.buyerName,
      productName: order.productName,
      transactionId: order.transactionId,
      orderId: order.orderId,
      liveId: order.liveId,
      timestamp: Date.now()
    });
    console.log(
      `[MICRO-RELAIS WS] 🎉 Signal de commission émis vers l'affilié ${order.affiliateId} : +${order.commissionAmount} ${order.currency}`
    );
  }

  // Notification globale au salon Live pour célébration collective
  if (order.liveId) {
    emitToTarget(order.liveId, 'live_order_placed', {
      liveId: order.liveId,
      buyerName: order.buyerName,
      productName: order.productName,
      amount: order.totalAmount,
      hasAffiliate: Boolean(order.affiliateId),
      timestamp: Date.now()
    });
  }

  // Émission géolocalisée Swarm Logistics (Prompt 17) : alerte instantanée pour les livreurs partenaires
  try {
    emitNewOrderPing({
      orderId: order.orderId,
      orderNumber: `CMD-${order.orderId.substring(order.orderId.length - 4)}`,
      buyerId: order.buyerId,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      sellerId: order.sellerId,
      productName: order.productName,
      amount: order.totalAmount,
      deliveryFee: 1000,
      neighborhood: 'Ouaga 2000',
      liveId: order.liveId
    });
  } catch (swarmErr) {
    console.warn('[MICRO-RELAIS] Erreur ping logistique essaim :', swarmErr);
  }

  return {
    success: true,
    orderId: order.orderId,
    transactionId: order.transactionId,
    totalAmount: order.totalAmount,
    sellerCredited: order.sellerAmount,
    affiliateCommission: order.commissionAmount,
    affiliateId: order.affiliateId,
    acidAudit: auditResult
  };
}

// ============================================================================
// 6. ROUTEUR EXPRESS DU MOTEUR MICRO-RELAIS
// ============================================================================

export function attachMicroRelayRoutes(app: Express): void {
  // --------------------------------------------------------------------------
  // ROUTE 1 : GET /api/live/join
  // Traçabilité du parrainage quand un spectateur rejoint avec ?ref=affiliateId
  // --------------------------------------------------------------------------
  app.get('/api/live/join', (req: Request, res: Response) => {
    try {
      const liveId = (req.query.liveId as string) || (req.query.roomId as string) || 'live-default';
      const userId = (req.query.userId as string) || (req.query.buyerId as string) || `user_${Date.now()}`;
      const socketId = req.query.socketId as string | undefined;
      const ref = (req.query.ref as string) || (req.query.affiliateId as string) || undefined;

      const result = trackLiveAffiliateJoin({
        liveId,
        userId,
        socketId,
        ref
      });

      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[ROUTE ERROR /api/live/join]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE 2 : POST /api/checkout/s
  // Encaissement total (15 000 FCFA) et enregistrement de l'affiliation
  // --------------------------------------------------------------------------
  app.post('/api/checkout/s', async (req: Request, res: Response) => {
    try {
      const {
        buyerId,
        buyerPhone,
        buyerName,
        sellerId,
        liveId,
        productId,
        productName,
        amount,
        currency,
        ref,
        commissionRate
      } = req.body;

      if (!sellerId || !amount) {
        return res.status(400).json({
          success: false,
          error: 'sellerId et amount sont obligatoires.'
        });
      }

      const result = await initiateSCheckout({
        buyerId: buyerId || `buyer_${Date.now()}`,
        buyerPhone: buyerPhone || '+22670000000',
        buyerName: buyerName || 'Spectateur Wameet',
        sellerId,
        liveId: liveId || 'live-default',
        productId: productId || 'prod-live-1',
        productName: productName || 'Article Live Shopping',
        amount: Number(amount),
        currency: currency || 'FCFA',
        ref,
        commissionRate: commissionRate ? Number(commissionRate) : 0.05
      });

      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[ROUTE ERROR /api/checkout/s]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE 3 : POST /api/checkout/s/webhook
  // Webhook de confirmation S -> Déclenche le Split & les Émissions WebSockets
  // --------------------------------------------------------------------------
  app.post(['/api/checkout/s/webhook', '/api/webhooks/s'], async (req: Request, res: Response) => {
    try {
      const transactionId =
        req.body?.transactionId ||
        req.body?.tx_ref ||
        req.body?.order_id ||
        (req.query.transactionId as string);

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: 'transactionId est manquant dans le payload du webhook.'
        });
      }

      const result = await handleSPaymentConfirmation({
        transactionId,
        receiptNumber: req.body?.receiptNumber,
        status: req.body?.status || 'SUCCESS'
      });

      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[WEBHOOK ERROR /api/checkout/s/webhook]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE 4 : POST /api/micro-relay/simulate-commission
  // Route de démonstration & de test instantané de bout en bout
  // Simule l'achat complet à 15 000 FCFA avec split 14 250 / 750 et émission WS
  // --------------------------------------------------------------------------
  app.post('/api/micro-relay/simulate-commission', async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, error: 'Simulation désactivée en production.' });
    }
    try {
      const {
        affiliateId = 'usr_relay_demo',
        sellerId = 'usr_seller_awa',
        buyerName = 'Amadou Traoré',
        productName = 'Coffret Prestige Karité Royal',
        amount = 15000,
        liveId = 'live-shopping-direct'
      } = req.body;

      // 1. Déclare l'achat
      const checkout = await initiateSCheckout({
        buyerId: `buyer_${Date.now()}`,
        buyerPhone: '+22670112233',
        buyerName,
        sellerId,
        liveId,
        productId: 'prod_karite_royal',
        productName,
        amount: Number(amount),
        currency: 'FCFA',
        ref: affiliateId,
        commissionRate: 0.05
      });

      // 2. Confirme immédiatement le webhook
      const confirmed = await handleSPaymentConfirmation({
        transactionId: checkout.transactionId
      });

      return res.status(200).json({
        success: true,
        message: 'Simulation Micro-Relais exécutée avec succès !',
        checkout,
        confirmation: confirmed
      });
    } catch (err: any) {
      console.error('[SIMULATE ERROR]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE 5 : GET /api/micro-relay/audit
  // Journal d'audit des transactions ACID pour contrôle financier
  // --------------------------------------------------------------------------
  app.get('/api/micro-relay/audit', (_req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      totalTransactions: ACID_AUDIT_LOGS.length,
      auditLogs: ACID_AUDIT_LOGS.slice(-50).reverse()
    });
  });

  console.log('✅ Routes Micro-Relais & Split S attachées sur /api/checkout/s & /api/live/join');
}
