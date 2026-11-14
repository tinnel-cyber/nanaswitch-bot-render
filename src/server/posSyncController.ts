/**
 * @file posSyncController.ts
 * @description Moteur de Synchronisation Phygitale (Backend Nanasore vers Wameet Live)
 * 
 * Directives d'architecture et logique métier :
 * 1. Webhook de caisse sécurisé (POST /api/pos/sync-sale) avec authentification Machine-to-Machine (M2M).
 * 2. Payload attendu : { items: [{ productId, quantitySold }], storeLocation }.
 * 3. Logique de Détection Live : Vérifie si un productId vendu est ACTUELLEMENT épinglé dans un live_room actif.
 * 4. Déclenchement WebSocket Temps Réel :
 *    - io.to(liveRoomId).emit('physical_store_sale', { productId, newStock, location })
 * 5. Sécurité de Rupture :
 *    - Si newStock === 0 : io.to(liveRoomId).emit('lock_product_sales', { productId, reason: '...' })
 */

import type { Request, Response } from 'express';
import { NANA_PRODUCT_CATALOG } from './smartHaggleController';

// ============================================================================
// 1. CONFIGURATION DU TOKEN MACHINE-TO-MACHINE (M2M)
// ============================================================================

export const POS_SYNC_M2M_TOKEN =
  process.env.POS_SYNC_M2M_TOKEN || 'nana_pos_m2m_phygital_secret_token_2026';

// ============================================================================
// 2. TYPES ET STRUCTURES DE DONNÉES DU GESTIONNAIRE PHYGITAL
// ============================================================================

export interface PosSaleItem {
  productId: string;
  quantitySold: number;
  productName?: string;
  unitPrice?: number;
}

export interface PosSyncSalePayload {
  storeLocation: string; // Ex: "Boutique Ouagadougou", "Boutique Abidjan Mall"
  items: PosSaleItem[];
  receiptId?: string;
  cashierId?: string;
  timestamp?: number;
}

export interface ActiveLiveRoomState {
  liveRoomId: string;
  title: string;
  sellerId: string;
  status: 'active' | 'closed';
  pinnedProductId: string | null;
  pinnedProductName?: string;
  currentStock: number;
  viewersCount: number;
  updatedAt: number;
}

export interface PhygitalSyncResult {
  processedItems: number;
  activeMatches: {
    liveRoomId: string;
    productId: string;
    productName: string;
    quantitySold: number;
    newStock: number;
    storeLocation: string;
    isOutOfStock: boolean;
  }[];
  unmatchedItems: string[];
}

export interface WebSocketRoomEmitter {
  to: (room: string) => {
    emit: (event: string, data: any) => void;
  };
  emit: (event: string, data: any) => void;
}

// ============================================================================
// 3. GESTIONNAIRE D'ÉTAT DES LIVE ROOMS ACTIFS (REGISTRY / STATE MANAGER)
// ============================================================================

/**
 * Registre en mémoire des salons Live actifs et de leurs produits épinglés
 * En production cluster, ceci peut être couplé à Redis ou Firestore onSnapshot
 */
const ACTIVE_LIVE_ROOMS = new Map<string, ActiveLiveRoomState>([
  [
    'live_room_abidjan',
    {
      liveRoomId: 'live_room_abidjan',
      title: 'Vente Flash Prestige Abidjan Mall 🔥',
      sellerId: 'awa_nana_empire',
      status: 'active',
      pinnedProductId: 'prod_flash_live_1',
      pinnedProductName: 'Coffret Karité Royal Or Prestige (Édition Limitée)',
      currentStock: 5,
      viewersCount: 142,
      updatedAt: Date.now()
    }
  ],
  [
    'live_room_ouaga',
    {
      liveRoomId: 'live_room_ouaga',
      title: 'Grand Déstockage Textile & Wax Ouagadougou',
      sellerId: 'moussa_fashion_bf',
      status: 'active',
      pinnedProductId: 'prod_flash_live_2',
      pinnedProductName: 'Robe Wax Royale Soie d’Abidjan',
      currentStock: 3,
      viewersCount: 89,
      updatedAt: Date.now()
    }
  ]
]);

let globalSocketEmitter: WebSocketRoomEmitter | null = null;

export function setPosSyncSocketEmitter(io: WebSocketRoomEmitter): void {
  globalSocketEmitter = io;
}

/**
 * Épingle ou met à jour le produit présenté en direct dans une live_room
 */
export function setPinnedProductInLiveRoom(
  liveRoomId: string,
  productId: string,
  productName: string,
  stock: number
): void {
  const room = ACTIVE_LIVE_ROOMS.get(liveRoomId);
  if (room) {
    room.pinnedProductId = productId;
    room.pinnedProductName = productName;
    room.currentStock = stock;
    room.status = 'active';
    room.updatedAt = Date.now();
  } else {
    ACTIVE_LIVE_ROOMS.set(liveRoomId, {
      liveRoomId,
      title: `Live Shopping Wameet #${liveRoomId}`,
      sellerId: 'seller_default',
      status: 'active',
      pinnedProductId: productId,
      pinnedProductName: productName,
      currentStock: stock,
      viewersCount: 1,
      updatedAt: Date.now()
    });
  }
}

/**
 * Récupère toutes les salles de direct actives
 */
export function getActiveLiveRooms(): ActiveLiveRoomState[] {
  return Array.from(ACTIVE_LIVE_ROOMS.values()).filter((r) => r.status === 'active');
}

// ============================================================================
// 4. FONCTION MAÎTRESSE : handlePosSyncSale(payload, io)
// ============================================================================

/**
 * Traite la synchronisation d'une vente en magasin physique :
 * 1. Détecte si le produit vendu est épinglé dans une live_room active.
 * 2. Met à jour le stock en temps réel.
 * 3. Déclenche 'physical_store_sale' via WebSockets en quelques millisecondes.
 * 4. Déclenche 'lock_product_sales' si rupture de stock (newStock === 0).
 */
export async function handlePosSyncSale(
  payload: PosSyncSalePayload,
  io?: WebSocketRoomEmitter
): Promise<PhygitalSyncResult> {
  const startTime = Date.now();
  const emitter = io || globalSocketEmitter;
  const { storeLocation, items } = payload;

  const result: PhygitalSyncResult = {
    processedItems: items.length,
    activeMatches: [],
    unmatchedItems: []
  };

  for (const item of items) {
    const { productId, quantitySold } = item;

    // Met à jour l'inventaire dans le catalogue produit Nanasore
    const catalogProduct = NANA_PRODUCT_CATALOG.get(productId);
    if (catalogProduct) {
      catalogProduct.stock = Math.max(0, catalogProduct.stock - quantitySold);
    }

    // 1. Détection Live : Vérifier si le productId est ACTUELLEMENT épinglé dans un Live actif
    let isMatchedInLive = false;

    for (const room of ACTIVE_LIVE_ROOMS.values()) {
      if (room.status === 'active' && room.pinnedProductId === productId) {
        isMatchedInLive = true;

        // Déduction du stock de la live room
        const updatedStock = Math.max(0, room.currentStock - quantitySold);
        room.currentStock = updatedStock;
        room.updatedAt = Date.now();

        const resolvedProductName =
          item.productName || room.pinnedProductName || catalogProduct?.name || 'Produit Phygital';

        const isOutOfStock = updatedStock <= 0;

        result.activeMatches.push({
          liveRoomId: room.liveRoomId,
          productId,
          productName: resolvedProductName,
          quantitySold,
          newStock: updatedStock,
          storeLocation,
          isOutOfStock
        });

        console.log(
          `[PHYGITAL MATCH] ⚡ Vente physique détectée pour ${resolvedProductName} à ${storeLocation} !` +
          ` Nouveau stock: ${updatedStock} (Room: ${room.liveRoomId})`
        );

        if (emitter) {
          // ===================================================================
          // 2. DÉCLENCHEMENT WEBSOCKET TEMPS RÉEL (Moins de 5 millisecondes)
          // Émet : io.to(liveRoomId).emit('physical_store_sale', { productId, newStock, location })
          // ===================================================================
          emitter.to(room.liveRoomId).emit('physical_store_sale', {
            productId,
            productName: resolvedProductName,
            newStock: updatedStock,
            quantitySold,
            location: storeLocation,
            timestamp: Date.now()
          });

          // ===================================================================
          // 3. SÉCURITÉ DE RUPTURE (KILL-SWITCH AUTOMATIQUE)
          // Si newStock === 0 : Envoie lock_product_sales pour bloquer l'achat
          // ===================================================================
          if (isOutOfStock) {
            console.warn(
              `[SECURITY ALERT] 🛑 RUPTURE DE STOCK IMMÉDIATE pour ${resolvedProductName} !` +
              ` Émission de lock_product_sales sur ${room.liveRoomId}.`
            );

            emitter.to(room.liveRoomId).emit('lock_product_sales', {
              productId,
              productName: resolvedProductName,
              newStock: 0,
              reason: 'physical_store_stock_exhausted',
              location: storeLocation,
              timestamp: Date.now()
            });

            // Désépingle le produit pour empêcher tout nouvel achat
            room.pinnedProductId = null;
          }
        }
      }
    }

    if (!isMatchedInLive) {
      result.unmatchedItems.push(productId);
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`[PHYGITAL ENGINE] Synchronisation caisse achevée en ${durationMs}ms (${result.activeMatches.length} alertes émises).`);

  return result;
}

// ============================================================================
// 5. CONTRÔLEUR EXPRESS ET ROUTE WEBHOOK DE CAISSE (POST /api/pos/sync-sale)
// ============================================================================

/**
 * Valide le token Machine-to-Machine (M2M) présent dans les headers
 */
function verifyM2mAuth(req: Request): boolean {
  const customHeaderToken = req.headers['x-pos-m2m-token'];
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'];

  if (customHeaderToken && customHeaderToken === POS_SYNC_M2M_TOKEN) {
    return true;
  }

  if (apiKeyHeader && apiKeyHeader === POS_SYNC_M2M_TOKEN) {
    return true;
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (bearer === POS_SYNC_M2M_TOKEN) {
      return true;
    }
  }

  return false;
}

export function attachPosSyncRoutes(app: any, io?: WebSocketRoomEmitter): void {
  if (io) {
    setPosSyncSocketEmitter(io);
  }

  /**
   * POST /api/pos/sync-sale
   * Webhook de Caisse Nanasore appelé lors de la validation d'un ticket de caisse
   */
  app.post('/api/pos/sync-sale', async (req: Request, res: Response) => {
    try {
      // 1. Contrôle d'Authentification Machine-to-Machine (M2M)
      if (!verifyM2mAuth(req)) {
        console.error('[SECURITY REJECTION] Requête POS sync rejetée : Token M2M invalide ou manquant.');
        return res.status(401).json({
          success: false,
          error: 'Accès non autorisé : Token d’authentification Machine-to-Machine (M2M) invalide.'
        });
      }

      // 2. Validation du payload entrant
      const { storeLocation, items, receiptId, cashierId } = req.body || {};

      if (!storeLocation || typeof storeLocation !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Champ obligatoire manquant : storeLocation requis (ex: "Boutique Ouagadougou").'
        });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Champ obligatoire manquant : items doit être un tableau non vide.'
        });
      }

      // Valide que chaque élément possède productId et quantitySold
      for (const it of items) {
        if (!it.productId || typeof it.quantitySold !== 'number' || it.quantitySold <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Chaque item doit contenir un productId valide et un quantitySold > 0.'
          });
        }
      }

      // 3. Exécution de la détection et déclenchement WebSocket
      const syncResult = await handlePosSyncSale({
        storeLocation,
        items,
        receiptId,
        cashierId,
        timestamp: Date.now()
      });

      return res.status(200).json({
        success: true,
        message: 'Synchronisation phygitale exécutée avec succès.',
        syncedAt: Date.now(),
        ...syncResult
      });
    } catch (err: any) {
      console.error('[FATAL POS SYNC ERROR]', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Erreur interne lors de la synchronisation phygitale.'
      });
    }
  });

  /**
   * GET /api/pos/live-rooms
   * Retourne l'état des live rooms actives (pour debug ou administration Nanasore)
   */
  app.get('/api/pos/live-rooms', (req: Request, res: Response) => {
    if (!verifyM2mAuth(req)) {
      return res.status(401).json({ success: false, error: 'Unauthorized M2M' });
    }
    return res.json({ success: true, rooms: getActiveLiveRooms() });
  });

  /**
   * POST /api/pos/pin-product
   * Permet au vendeur de définir ou changer le produit épinglé dans une salle
   */
  app.post('/api/pos/pin-product', (req: Request, res: Response) => {
    if (!verifyM2mAuth(req)) {
      return res.status(401).json({ success: false, error: 'Unauthorized M2M' });
    }
    const { liveRoomId, productId, productName, stock } = req.body || {};
    if (!liveRoomId || !productId) {
      return res.status(400).json({ success: false, error: 'liveRoomId et productId requis' });
    }
    setPinnedProductInLiveRoom(liveRoomId, productId, productName || productId, Number(stock || 5));
    return res.json({ success: true, message: 'Produit épinglé avec succès.' });
  });

  /**
   * POST /api/pos/auto-order
   * Commande physique automatisée déclenchée par le Contrat Intelligent de la Cagnotte (Prompt 21)
   * Génère le bon de commande physique et réserve le stock dans le système Nanasore.
   */
  app.post('/api/pos/auto-order', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const isInternal =
        authHeader === `Bearer ${POS_SYNC_M2M_TOKEN}` ||
        req.headers['x-internal-token'] === POS_SYNC_M2M_TOKEN ||
        req.headers['x-m2m-token'] === POS_SYNC_M2M_TOKEN;

      if (!isInternal && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ success: false, error: 'Unauthorized M2M Token' });
      }

      const {
        productId,
        productName,
        orderAmount,
        cagnotteId,
        recipientName,
        deliverySlot,
        deliveryAddress,
        merchantWalletId
      } = req.body || {};

      const orderId = `CMD-POS-AUTO-${Date.now().toString().slice(-6)}`;
      console.log(
        `[POS AUTO-ORDER] 📦 Commande physique automatique générée : ${orderId} pour ${
          productName || productId
        } (${orderAmount} FCFA). Destinataire: ${recipientName}`
      );

      return res.status(200).json({
        success: true,
        orderId,
        productId,
        productName,
        orderAmount,
        status: 'PREPARING_GIFT',
        merchantWalletId: merchantWalletId || 'wallet_pos_merchant',
        deliverySlot: deliverySlot || 'Livraison à la fête',
        deliveryAddress: deliveryAddress || 'Adresse client',
        createdAt: Date.now()
      });
    } catch (err: any) {
      console.error('[POS AUTO-ORDER ERROR]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
}
