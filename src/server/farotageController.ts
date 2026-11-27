/**
 * @file farotageController.ts
 * @description Moteur Backend Node.js & WebSockets - "Farotage Digital" Wameet
 * 
 * Directives Prompt 19 :
 * 1. Initialisation (POST /api/farotage/init) :
 *    - L'invité choisit un montant (ex: 10 000 FCFA).
 *    - Le serveur génère une requête de paiement via ./s-client.
 *    - Crée une transaction en statut 'pending', liée au groupId et senderId.
 *    - Renvoie l'URL de paiement S au frontend.
 * 2. Webhook de Célébration (POST /api/farotage/webhook) :
 *    - Appelée par S quand le Mobile Money est validé.
 *    - Sécurité : Vérifie la signature du webhook (HMAC SHA-256).
 *    - Action Financière : Crédite le Wallet des mariés (moins commission Wameet)
 *      via des transactions ACID avec verrous Mutex anti-perte de fonds.
 * 3. Le Déclencheur Temps Réel (L'Explosion) :
 *    - Immédiatement après validation, émet l'événement de célébration :
 *      io.to(groupId).emit('farotage_success', { senderName, amount, timestamp, ... })
 *    - C'est ce signal exact qui déclenche la pluie de billets sur le frontend de tous les invités !
 */

import crypto from 'crypto';
import type { Request, Response, Express } from 'express';
import sClient from './sebpay-client';

// ============================================================================
// 1. TYPES & INTERFACES DU FAROTAGE DIGITAL
// ============================================================================

export type FarotageStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface FarotageTransaction {
  transactionId: string;
  orderId: string;
  groupId: string;             // ID du groupe d'événement (ex: 'mariage_awa_moussa_2026')
  senderId: string;            // ID de l'invité qui farote
  senderName: string;          // Nom de l'invité (ex: 'Tonton Boureima', 'Awa K.')
  senderPhone?: string;        // Numéro de téléphone Mobile Money
  recipientId: string;         // ID du Wallet des bénéficiaires (les mariés)
  amount: number;              // Montant brut du farotage (ex: 25 000 FCFA)
  wameetFee: number;           // Frais de plateforme Wameet (ex: 2% = 500 FCFA)
  netAmount: number;           // Montant net crédité aux mariés (ex: 24 500 FCFA)
  currency: string;            // 'FCFA' / 'XOF'
  note?: string;               // Message / Dédicace (ex: 'Félicitations et longue vie ! 🎉')
  status: FarotageStatus;
  paymentUrl?: string;
  createdAt: number;
  completedAt?: number;
}

export interface FarotageInitPayload {
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhone?: string;
  recipientId: string;
  amount: number;
  currency?: string;
  note?: string;
}

export interface FarotageSocketBroadcaster {
  to: (targetId: string) => {
    emit: (event: string, data: any) => void;
  };
  emit: (event: string, data: any) => void;
}

// ============================================================================
// 2. REGISTRES EN MÉMOIRE & SÉCURITÉ TRANSACTIONNELLE ACID
// ============================================================================

// Registre des transactions de Farotage : Map<transactionId, FarotageTransaction>
const FAROTAGE_TRANSACTIONS = new Map<string, FarotageTransaction>();

// Index de recherche par orderId
const FAROTAGE_BY_ORDER_ID = new Map<string, string>();

// Verrous d'exclusion mutuelle par Wallet (Atomic Mutex Locks)
const WALLET_MUTEX_LOCKS = new Set<string>();

// Clé secrète de signature Webhook S (aucun secret par défaut en dur)
const getSFarotageSecret = () => String(process.env.S_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || '').trim();

// Émetteur WebSocket centralisé
let globalSocketEmitter: FarotageSocketBroadcaster | null = null;

// Sockets associés à chaque groupe d'événement : Map<groupId, Set<string>>
const GROUP_CONNECTED_SOCKETS = new Map<string, Set<string>>();

export function setFarotageSocketEmitter(io: FarotageSocketBroadcaster): void {
  globalSocketEmitter = io;
}

export function registerSocketToFarotageGroup(groupId: string, socketId: string): void {
  if (!GROUP_CONNECTED_SOCKETS.has(groupId)) {
    GROUP_CONNECTED_SOCKETS.set(groupId, new Set());
  }
  GROUP_CONNECTED_SOCKETS.get(groupId)!.add(socketId);
  console.log(`[FAROTAGE WS] Socket ${socketId} rattaché au groupe de célébration "${groupId}"`);
}

export function unregisterSocketFromFarotageGroup(socketId: string): void {
  for (const [groupId, sockets] of GROUP_CONNECTED_SOCKETS.entries()) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      GROUP_CONNECTED_SOCKETS.delete(groupId);
    }
  }
}

// ============================================================================
// 3. MOTEUR TRANSACTIONNEL ACID (WALLET DES MARIÉS SÉCURISÉ)
// ============================================================================

async function acquireWalletLock(walletId: string, maxWaitMs = 3000): Promise<boolean> {
  const start = Date.now();
  while (WALLET_MUTEX_LOCKS.has(walletId)) {
    if (Date.now() - start > maxWaitMs) {
      throw new Error(`[FAROTAGE ACID TIMEOUT] Impossible d'acquérir le verrou pour ${walletId}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  WALLET_MUTEX_LOCKS.add(walletId);
  return true;
}

function releaseWalletLock(walletId: string): void {
  WALLET_MUTEX_LOCKS.delete(walletId);
}

/**
 * Diffuse l'événement WebSocket vers une cible (room/groupe, utilisateur ou tous les sockets du groupe)
 */
function emitFarotageEvent(targetId: string, event: string, data: any): void {
  if (!globalSocketEmitter) {
    console.warn(`[FAROTAGE WS] Aucun émetteur WebSocket actif pour "${event}" vers ${targetId}`);
    return;
  }

  // 1. Émission directe via io.to(targetId)
  try {
    globalSocketEmitter.to(targetId).emit(event, data);
  } catch (err) {
    console.warn(`[FAROTAGE WS] Erreur io.to(${targetId}) :`, err);
  }

  // 2. Si targetId est un groupId répertorié, arrose directement tous ses sockets connectés
  const sockets = GROUP_CONNECTED_SOCKETS.get(targetId);
  if (sockets && sockets.size > 0) {
    for (const socketId of sockets) {
      try {
        globalSocketEmitter.to(socketId).emit(event, data);
      } catch {}
    }
  }
}

/**
 * Vérifie la signature de sécurité du Webhook S (HMAC SHA-256)
 */
export function verifySSignature(payloadString: string, signatureHeader?: string): boolean {
  const secret = getSFarotageSecret();
  if (!secret || !signatureHeader) {
    return false;
  }

  try {
    const computedHmac = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(computedHmac, 'utf8'),
      Buffer.from(signatureHeader, 'utf8')
    );
  } catch {
    return false;
  }
}

// ============================================================================
// 4. LOGIQUE MÉTIER STRICTE (PROMPT 19)
// ============================================================================

/**
 * 1. Initialisation (POST /api/farotage/init)
 * L'invité choisit un montant -> génération de la transaction et du lien Sebpay
 */
export async function initializeFarotage(payload: FarotageInitPayload) {
  const {
    groupId,
    senderId,
    senderName,
    senderPhone = '+22670000000',
    recipientId,
    amount,
    currency = 'FCFA',
    note = 'Vive les mariés ! 🎉'
  } = payload;

  if (!groupId || !senderId || !recipientId || !amount || amount <= 0) {
    throw {
      status: 400,
      code: 'INVALID_FAROTAGE_PAYLOAD',
      message: 'groupId, senderId, recipientId et un montant positif sont obligatoires.'
    };
  }

  const rawAmount = Math.round(Number(amount));
  const commissionRate = 0.02; // 2% frais de fonctionnement Wameet
  const wameetFee = Math.round(rawAmount * commissionRate);
  const netAmount = rawAmount - wameetFee;

  const orderId = `farotage_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  // 1. Initialisation du paiement auprès de S Client local
  const escrowRes = await sClient.createEscrowPayment({
    amount: rawAmount,
    currency,
    description: `Farotage Digital Wameet : ${senderName}`,
    customerPhone: senderPhone,
    customerName: senderName,
    buyerId: senderId,
    metadata: {
      orderId,
      groupId,
      senderId,
      senderName,
      recipientId,
      wameetFee,
      netAmount,
      note,
      type: 'FAROTAGE_DIGITAL'
    }
  });

  const transactionId = escrowRes.transactionId;

  // 2. Enregistrement en base / registre en statut 'pending'
  const farotageTx: FarotageTransaction = {
    transactionId,
    orderId,
    groupId,
    senderId,
    senderName,
    senderPhone,
    recipientId,
    amount: rawAmount,
    wameetFee,
    netAmount,
    currency,
    note,
    status: 'pending',
    paymentUrl: escrowRes.paymentUrl,
    createdAt: Date.now()
  };

  FAROTAGE_TRANSACTIONS.set(transactionId, farotageTx);
  FAROTAGE_BY_ORDER_ID.set(orderId, transactionId);

  console.log(
    `[FAROTAGE INIT] Transaction ${transactionId} créée (${rawAmount} ${currency}) par "${senderName}" pour les mariés (${recipientId}) dans le groupe "${groupId}"`
  );

  return {
    success: true,
    transactionId,
    orderId,
    amount: rawAmount,
    netAmount,
    currency,
    paymentUrl: escrowRes.paymentUrl,
    groupId,
    senderName
  };
}

/**
 * 2. Le Webhook de Célébration (POST /api/farotage/webhook)
 * Appelée par S lors de la validation Mobile Money.
 * Crédite le Wallet des mariés (ACID) et déclenche l'événement farotage_success (L'Explosion).
 */
export async function handleFarotageWebhook(params: {
  transactionId: string;
  receiptNumber?: string;
  status?: string;
  rawPayload?: string;
  signature?: string;
}) {
  const { transactionId, rawPayload, signature } = params;

  // Sécurité : Vérification de la signature du webhook si fournie
  if (rawPayload && signature) {
    const isSignatureValid = verifySSignature(rawPayload, signature);
    if (!isSignatureValid) {
      console.warn(`[FAROTAGE SÉCURITÉ] ❌ Signature Webhook invalide pour Tx ${transactionId}`);
      throw {
        status: 403,
        code: 'INVALID_WEBHOOK_SIGNATURE',
        message: 'Signature de sécurité S invalide.'
      };
    }
  }

  // Résolution de la transaction
  let tx = FAROTAGE_TRANSACTIONS.get(transactionId);
  if (!tx && FAROTAGE_BY_ORDER_ID.has(transactionId)) {
    const resolvedId = FAROTAGE_BY_ORDER_ID.get(transactionId)!;
    tx = FAROTAGE_TRANSACTIONS.get(resolvedId);
  }

  if (!tx) {
    throw {
      status: 404,
      code: 'TRANSACTION_NOT_FOUND',
      message: `Transaction de Farotage introuvable : ${transactionId}`
    };
  }

  // Idempotence : si déjà complété, on ne re-crédite pas les mariés
  if (tx.status === 'completed') {
    console.log(`[FAROTAGE WEBHOOK] Transaction ${tx.transactionId} déjà validée (Idempotence).`);
    return {
      success: true,
      message: 'Farotage déjà célébré avec succès.',
      alreadyCompleted: true,
      transaction: tx
    };
  }

  // 1. Capture définitive auprès de S
  await sClient.captureEscrowPayment(tx.transactionId, tx.amount);

  // 2. Action Financière ACID : Crédit sécurisé du Wallet des Mariés
  const walletKey = `wallet_${tx.recipientId}`;
  await acquireWalletLock(walletKey);

  try {
    const walletRes = await sClient.creditWameetWallet(
      tx.recipientId,
      tx.netAmount,
      `Farotage Digital de ${tx.senderName} (Tx: ${tx.transactionId})`
    );

    tx.status = 'completed';
    tx.completedAt = Date.now();

    console.log(
      `[FAROTAGE ACID COMMIT] ✅ Wallet des mariés (${tx.recipientId}) crédité de +${tx.netAmount} ${tx.currency} (Nouveau solde: ${walletRes.balance} ${tx.currency})`
    );
  } catch (creditErr: any) {
    console.error(`[FAROTAGE CRITICAL ERROR] Échec du crédit des mariés :`, creditErr);
    throw creditErr;
  } finally {
    releaseWalletLock(walletKey);
  }

  // =========================================================================
  // 3. LE DÉCLENCHEUR TEMPS RÉEL (L'EXPLOSION)
  // Immédiatement après validation, émet le signal exact :
  // io.to(groupId).emit('farotage_success', { senderName, amount, timestamp })
  // C'est ce signal exact qui déclenche la pluie de billets sur tous les téléphones !
  // =========================================================================
  const celebrationPayload = {
    transactionId: tx.transactionId,
    groupId: tx.groupId,
    senderName: tx.senderName,
    senderId: tx.senderId,
    recipientId: tx.recipientId,
    amount: tx.amount,
    currency: tx.currency,
    netAmount: tx.netAmount,
    note: tx.note,
    timestamp: tx.completedAt || Date.now()
  };

  emitFarotageEvent(tx.groupId, 'farotage_success', celebrationPayload);

  console.log(
    `[FAROTAGE EXPLOSION WS] 💸 Signal "farotage_success" émis vers le groupe "${tx.groupId}" : ${tx.senderName} a envoyé ${tx.amount} ${tx.currency} !`
  );

  return {
    success: true,
    message: 'Farotage validé et pluie de billets déclenchée !',
    celebration: celebrationPayload,
    transaction: tx
  };
}

// ============================================================================
// 5. ATTACHEMENT DU ROUTEUR EXPRESS
// ============================================================================

export function attachFarotageRoutes(app: Express): void {
  // --------------------------------------------------------------------------
  // ROUTE 1 : POST /api/farotage/init
  // Initialise le don / farotage et génère le lien de paiement S
  // --------------------------------------------------------------------------
  app.post('/api/farotage/init', async (req: Request, res: Response) => {
    try {
      const result = await initializeFarotage(req.body);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[ROUTE ERROR /api/farotage/init]', err);
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'FAROTAGE_INIT_ERROR',
        message: err.message || 'Erreur lors de l’initialisation du farotage'
      });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE 2 : POST /api/farotage/webhook
  // Webhook appelé par S lors de la validation Mobile Money
  // --------------------------------------------------------------------------
  app.post('/api/farotage/webhook', async (req: Request, res: Response) => {
    try {
      const transactionId =
        req.body?.transactionId ||
        req.body?.tx_ref ||
        req.body?.order_id ||
        (req.query.transactionId as string);

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          code: 'MISSING_TX_ID',
          message: 'transactionId est manquant dans le payload.'
        });
      }

      const signature = String(
        req.headers['x-s-signature'] ||
          req.headers['x-sebpay-signature'] ||
          req.headers['x-webhook-signature'] ||
          req.headers['x-signature'] ||
          ''
      )
        .replace(/^sha256=/i, '')
        .trim();
      const rawPayload = (req as any).rawBody
        ? (req as any).rawBody.toString('utf8')
        : JSON.stringify(req.body || {});

      if (!signature || !verifySSignature(rawPayload, signature)) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_WEBHOOK_SIGNATURE',
          message: 'Signature cryptographique HMAC requise et valide.'
        });
      }

      if (!req.body?.status) {
        return res.status(400).json({
          success: false,
          code: 'MISSING_STATUS',
          message: 'Statut de transaction requis.'
        });
      }

      const result = await handleFarotageWebhook({
        transactionId,
        receiptNumber: req.body?.receiptNumber,
        status: String(req.body.status),
        rawPayload,
        signature
      });

      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[ROUTE ERROR /api/farotage/webhook]', err);
      return res.status(err.status || 500).json({
        success: false,
        code: err.code || 'FAROTAGE_WEBHOOK_ERROR',
        message: err.message || 'Erreur lors du traitement du webhook'
      });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE 3 : GET /api/farotage/transactions
  // Récupère la liste des farotages et le montant total cumulé pour l'événement
  // --------------------------------------------------------------------------
  app.get('/api/farotage/transactions', (req: Request, res: Response) => {
    const groupId = req.query.groupId as string;

    let list = Array.from(FAROTAGE_TRANSACTIONS.values());
    if (groupId) {
      list = list.filter((t) => t.groupId === groupId);
    }

    const completedList = list.filter((t) => t.status === 'completed');
    const totalCollected = completedList.reduce((sum, t) => sum + t.amount, 0);
    const netTotal = completedList.reduce((sum, t) => sum + t.netAmount, 0);

    return res.status(200).json({
      success: true,
      totalCount: completedList.length,
      totalCollected,
      netTotal,
      currency: 'FCFA',
      transactions: completedList.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    });
  });

  // --------------------------------------------------------------------------
  // ROUTE 4 : POST /api/farotage/simulate
  // Simulation en direct de bout en bout pour tester l'animation et le son
  // --------------------------------------------------------------------------
  app.post('/api/farotage/simulate', async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, error: 'Simulation désactivée en production.' });
    }
    try {
      const {
        groupId = 'mariage_awa_moussa_2026',
        senderName = 'Tonton Boureima',
        senderId = `guest_${Date.now()}`,
        recipientId = 'wallet_maries_2026',
        amount = 10000,
        note = 'Félicitations et longue vie d’amour aux mariés ! 💍🎉'
      } = req.body;

      // 1. Initialise
      const initResult = await initializeFarotage({
        groupId,
        senderId,
        senderName,
        recipientId,
        amount: Number(amount),
        currency: 'FCFA',
        note
      });

      // 2. Confirme immédiatement le webhook
      const confirmResult = await handleFarotageWebhook({
        transactionId: initResult.transactionId
      });

      return res.status(200).json({
        success: true,
        message: 'Simulation Farotage Digital exécutée avec succès !',
        init: initResult,
        confirmation: confirmResult
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  console.log('✅ Routes Farotage Digital attachées sur /api/farotage/init & /api/farotage/webhook');
}

export default {
  initializeFarotage,
  handleFarotageWebhook,
  attachFarotageRoutes,
  setFarotageSocketEmitter,
  registerSocketToFarotageGroup,
  unregisterSocketFromFarotageGroup
};
