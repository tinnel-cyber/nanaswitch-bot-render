/**
 * Contrôleur & Moteur Backend Live-Shopping Wameet ("Live Commerce")
 * Connecte les diffusions en direct aux stocks réels du logiciel Nanasore
 * 
 * - Gestion des Salons WebSockets isolés : socket.join('live_room_ID')
 * - Événement Push Product : seller_push_product -> show_product_toast (< 100ms)
 * - Événement Phygital Sync : Webhook POST /api/live/stock-update -> phygital_scarcity_alert
 * - Achat Rapide 1-clic : buy_live_product (Smart Escrow Mobile Money)
 */

const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const { createSebpayCollection } = require('./sebpay-client');

class LiveCommerceEngine {
  constructor({ db, fetchViaFixie }) {
    this.db = db;
    this.fetchViaFixie = fetchViaFixie;

    // Salons Live en mémoire : Map<roomId, LiveRoomState>
    this.rooms = new Map();

    // Mapping socket -> Set<roomId>
    this.socketRooms = new Map();

    // Façade "io.to(roomId).emit(event, data)" pour conformité stricte avec les directives
    this.io = {
      to: (roomId) => ({
        emit: (event, data) => this.emitToRoom(roomId, event, data)
      })
    };
  }

  /**
   * Récupère ou initialise l'état d'un salon Live
   */
  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        roomId,
        clients: new Set(),
        activeProductId: null,
        activeProductData: null,
        currentStock: 0,
        sellerId: null,
        storeId: null,
        viewersCount: 0,
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      });
    }
    return this.rooms.get(roomId);
  }

  /**
   * Logique socket.join('live_room_ID') : isole les spectateurs dans le salon Live
   */
  joinRoom(socket, roomId, userData = {}) {
    if (!socket || !roomId) return;

    const room = this.getOrCreateRoom(roomId);
    room.clients.add(socket);
    room.viewersCount = room.clients.size;
    room.lastActivity = new Date().toISOString();

    // Associe le socket à cette room
    if (!this.socketRooms.has(socket)) {
      this.socketRooms.set(socket, new Set());
    }
    this.socketRooms.get(socket).add(roomId);

    // Attache la méthode socket.join pour les appels directs
    if (!socket.join) {
      socket.join = (targetRoomId) => this.joinRoom(socket, targetRoomId);
    }

    console.log(`[LIVE COMMERCE] Spectateur ${userData.userId || 'anon'} a rejoint le Live ${roomId} (${room.viewersCount} spectateurs).`);

    // 1. Accusé de réception avec l'état actuel de la room
    this.sendToSocket(socket, 'room_joined', {
      roomId,
      viewersCount: room.viewersCount,
      activeProduct: room.activeProductData
    });

    // 2. Si un produit est actuellement poussé, l'envoyer immédiatement au nouveau spectateur (< 50ms)
    if (room.activeProductData) {
      this.sendToSocket(socket, 'show_product_toast', room.activeProductData);
    }

    // 3. Diffuse la mise à jour du compteur de spectateurs au salon
    this.io.to(roomId).emit('live_viewers_updated', {
      roomId,
      viewersCount: room.viewersCount
    });
  }

  /**
   * Retire un socket d'un salon Live
   */
  leaveRoom(socket, roomId) {
    if (!socket || !roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.clients.delete(socket);
      room.viewersCount = room.clients.size;
      this.io.to(roomId).emit('live_viewers_updated', {
        roomId,
        viewersCount: room.viewersCount
      });
      if (room.clients.size === 0) {
        // Garder les métadonnées en mémoire pendant 1h
        console.log(`[LIVE COMMERCE] Salon ${roomId} vide.`);
      }
    }

    const roomsOfSocket = this.socketRooms.get(socket);
    if (roomsOfSocket) {
      roomsOfSocket.delete(roomId);
      if (roomsOfSocket.size === 0) {
        this.socketRooms.delete(socket);
      }
    }
  }

  /**
   * Retire un socket de tous ses salons (déconnexion)
   */
  handleSocketDisconnect(socket) {
    const rooms = this.socketRooms.get(socket);
    if (rooms) {
      for (const roomId of rooms) {
        this.leaveRoom(socket, roomId);
      }
    }
  }

  /**
   * Émission vers tous les spectateurs d'un salon : io.to(roomId).emit(event, data)
   */
  emitToRoom(roomId, event, data, excludeSocket = null) {
    const room = this.rooms.get(roomId);
    if (!room || room.clients.size === 0) return 0;

    const payload = JSON.stringify({
      event,
      data,
      roomId,
      timestamp: Date.now()
    });

    let sentCount = 0;
    for (const client of room.clients) {
      if (client !== excludeSocket && client.readyState === 1 /* OPEN */) {
        try {
          client.send(payload);
          sentCount++;
        } catch (err) {
          console.warn(`[LIVE COMMERCE] Erreur envoi vers client dans ${roomId} :`, err.message);
        }
      }
    }
    return sentCount;
  }

  /**
   * Envoi d'un message direct à un seul socket
   */
  sendToSocket(socket, event, data) {
    if (socket && socket.readyState === 1 /* OPEN */) {
      try {
        socket.send(JSON.stringify({ event, data, timestamp: Date.now() }));
      } catch (err) {
        console.warn('[LIVE COMMERCE] Erreur envoi direct :', err.message);
      }
    }
  }

  // =========================================================================
  // 1. ÉVÉNEMENT "PUSH PRODUCT" : on('seller_push_product', data)
  // =========================================================================
  async handleSellerPushProduct(roomId, productData) {
    const startTime = Date.now();
    const room = this.getOrCreateRoom(roomId);

    // Normalisation des champs du produit
    const normalizedProduct = {
      id: productData.id || productData.productId || `prod_${Date.now()}`,
      name: productData.name || productData.title || 'Article Flash Live',
      price: Number(productData.price || 0),
      promoPrice: Number(productData.promoPrice || productData.price || 0),
      originalPrice: Number(productData.originalPrice || productData.compareAtPrice || productData.price || 0),
      imageUrl: productData.imageUrl || productData.image || '',
      stock: Number(productData.stock ?? productData.inventoryQuantity ?? 5),
      description: productData.description || '',
      pushedAt: new Date().toISOString()
    };

    // Sauvegarde en mémoire dans la room
    room.activeProductId = normalizedProduct.id;
    room.activeProductData = normalizedProduct;
    room.currentStock = normalizedProduct.stock;
    room.sellerId = productData.sellerId || room.sellerId;
    room.storeId = productData.storeId || room.storeId;
    room.lastActivity = new Date().toISOString();

    // DIFFUSION ULTRA-RAPIDE AUX SPECTATEURS (< 100ms)
    // Directive stricte : io.to('live_room_ID').emit('show_product_toast', productData)
    const sentCount = this.io.to(roomId).emit('show_product_toast', normalizedProduct);
    const latencyMs = Date.now() - startTime;

    console.log(`[LIVE COMMERCE PUSH] Produit "${normalizedProduct.name}" poussé sur ${roomId} en ${latencyMs}ms (${sentCount} spectateurs notifiés).`);

    // Sauvegarde asynchrone non-bloquante dans Firestore
    if (this.db) {
      const now = new Date().toISOString();
      const liveEventRef = this.db.collection('live_events').doc(roomId);
      const flashRoomRef = this.db.collection('flash_live_rooms').doc(roomId);

      const updateData = {
        activeProductId: normalizedProduct.id,
        activeProduct: normalizedProduct,
        stock: normalizedProduct.stock,
        pushedAt: now,
        updatedAt: now
      };

      Promise.all([
        liveEventRef.set(updateData, { merge: true }),
        flashRoomRef.set(updateData, { merge: true })
      ]).catch((err) => {
        console.warn('[LIVE COMMERCE FIRESTORE NOTICE] Erreur persistance push product :', err.message);
      });
    }

    return {
      success: true,
      latencyMs,
      sentCount,
      product: normalizedProduct
    };
  }

  // =========================================================================
  // 2. ÉVÉNEMENT "PHYGITAL SYNC" (Webhook POST /api/live/stock-update)
  // =========================================================================
  async handlePhygitalStockUpdate(params) {
    const {
      storeId,
      storeName = 'Boutique physique Nanasore',
      productId,
      quantitySold = 1,
      newStockCount,
      cashierId,
      timestamp = new Date().toISOString()
    } = params;

    if (!productId || newStockCount === undefined) {
      throw new Error('productId et newStockCount sont requis pour la synchronisation phygitale.');
    }

    const numericNewStock = Math.max(0, Number(newStockCount));
    const numericQtySold = Number(quantitySold || 1);
    const affectedRooms = [];

    console.log(`[PHYGITAL SYNC] Notification caisse physique : ${numericQtySold}x ${productId} vendu(s) à "${storeName}". Nouveau stock: ${numericNewStock}`);

    // Recherche 1 : Dans les salons actifs en mémoire
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.activeProductId === productId) {
        // Mise à jour immédiate du stock dans la room
        room.currentStock = numericNewStock;
        if (room.activeProductData) {
          room.activeProductData.stock = numericNewStock;
        }

        // ÉMISSION ULTRA-RAPIDE DU SIGNAL DE RARETÉ PHYGITALE
        // Directive stricte : io.to('live_room_ID').emit('phygital_scarcity_alert', newStockCount)
        this.io.to(roomId).emit('phygital_scarcity_alert', {
          productId,
          newStockCount: numericNewStock,
          quantitySold: numericQtySold,
          storeName,
          timestamp
        });

        // Met également à jour la mini-carte toast en surimpression avec le nouveau stock
        if (room.activeProductData) {
          this.io.to(roomId).emit('show_product_toast', room.activeProductData);
        }

        affectedRooms.push(roomId);
        console.log(`[PHYGITAL SYNC ALERT] Alerte rareté émise sur ${roomId} ! Stock restant: ${numericNewStock}`);
      }
    }

    // Recherche 2 : Dans Firestore si le live a été initialisé sur une autre instance
    if (this.db) {
      try {
        const querySnap = await this.db.collection('live_events')
          .where('activeProductId', '==', productId)
          .limit(5)
          .get();

        const batch = this.db.batch();
        querySnap.forEach((docSnap) => {
          batch.set(docSnap.ref, {
            stock: numericNewStock,
            'activeProduct.stock': numericNewStock,
            lastPhygitalSaleAt: timestamp,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });
        await batch.commit();
      } catch (e) {
        console.warn('[PHYGITAL SYNC NOTICE] Erreur mise à jour Firestore :', e.message);
      }
    }

    return {
      success: true,
      productId,
      newStockCount: numericNewStock,
      phygitalAlertTriggered: affectedRooms.length > 0,
      affectedRooms,
      message: affectedRooms.length > 0
        ? `Alerte de rareté phygitale diffusée en direct dans ${affectedRooms.length} salon(s) Live.`
        : 'Stock mis à jour en base de données. Aucun salon live ne présente ce produit actuellement.'
    };
  }

  // =========================================================================
  // 3. ACHAT RAPIDE : event buy_live_product (Smart Escrow Mobile Money)
  // =========================================================================
  async handleBuyLiveProduct(data) {
    const {
      roomId,
      productId,
      buyerId = 'buyer_live',
      buyerName = 'Acheteur Live',
      buyerPhone = '+22670000000',
      amount,
      sellerId = 'seller_live',
      paymentOperator = 'MOMO'
    } = data;

    const room = this.rooms.get(roomId);
    const activeProd = room?.activeProductData || {};
    const effectiveAmount = Number(amount || activeProd.promoPrice || activeProd.price || 5000);
    const productName = activeProd.name || data.productName || 'Article Live Flash';
    const transactionId = `TX_ESC_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const nowServer = new Date().toISOString();

    console.log(`[BUY LIVE PRODUCT] Achat 1-clic pour ${transactionId} (${effectiveAmount} FCFA) par ${buyerName}`);

    // Décrémentation du stock dans le salon
    if (room) {
      room.currentStock = Math.max(0, (room.currentStock || 1) - 1);
      if (room.activeProductData) {
        room.activeProductData.stock = room.currentStock;
      }
    }

    // 1. Initialisation de la transaction Smart Escrow dans Firestore
    if (this.db) {
      const escrowRef = this.db.collection('Transactions').doc(transactionId);
      const auditRef = this.db.collection('wameet_escrow_transactions').doc(transactionId);

      const escrowData = {
        id: transactionId,
        type: 'escrow',
        roomId: roomId || null,
        productId: productId || activeProd.id,
        itemTitle: productName,
        title: productName,
        amount: effectiveAmount,
        currency: 'XOF',
        senderId: buyerId,
        receiverId: sellerId,
        buyerName,
        buyerPhone,
        status: 'pending',
        escrowStatus: 'pending',
        paymentOperator,
        createdAt: nowServer,
        updatedAt: nowServer
      };

      await Promise.all([
        escrowRef.set(escrowData, { merge: true }),
        auditRef.set(escrowData, { merge: true })
      ]).catch((err) => {
        console.warn('[BUY LIVE PRODUCT] Notice Firestore :', err.message);
      });
    }

    // 2. Génération du lien de paiement Mobile Money sécurisé
    let paymentUrl = null;
    try {
      const sebpayRes = await createSebpayCollection({
        orderId: transactionId,
        amount: effectiveAmount,
        currency: 'XOF',
        phone: buyerPhone,
        customerName: buyerName,
        description: `Smart Escrow Live: ${productName}`,
        callbackUrl: 'https://nana-payment-api.onrender.com/api/chat-finance/webhook'
      });
      paymentUrl = sebpayRes.provider_link || sebpayRes.redirectUrl;
    } catch {}

    if (!paymentUrl) {
      paymentUrl = `https://checkout.cinetpay.com/payment/${transactionId}?amount=${effectiveAmount}&currency=XOF`;
    }

    // 3. Notification en temps réel aux autres spectateurs du Live
    if (roomId) {
      this.io.to(roomId).emit('live_order_placed', {
        roomId,
        buyerName,
        productName,
        amount: effectiveAmount,
        transactionId,
        remainingStock: room?.currentStock ?? 1,
        timestamp: nowServer
      });
    }

    return {
      success: true,
      transactionId,
      status: 'pending',
      amount: effectiveAmount,
      paymentUrl,
      remainingStock: room?.currentStock ?? 1,
      message: 'Transaction Smart Escrow initiée avec succès.'
    };
  }
}

// ============================================================================
// ROUTEUR EXPRESS DU LIVE COMMERCE
// ============================================================================

function createLiveCommerceRouter({ engine }) {
  const router = express.Router();

  // --------------------------------------------------------------------------
  // WEBHOOK "PHYGITAL SYNC" : POST /api/live/stock-update
  // Déclenché par une caisse physique Nanasore lorsqu'un article est vendu
  // --------------------------------------------------------------------------
  router.post('/stock-update', async (req, res) => {
    try {
      const {
        storeId,
        storeName,
        productId,
        quantitySold,
        newStockCount,
        cashierId,
        timestamp
      } = req.body;

      if (!productId || newStockCount === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Les paramètres productId et newStockCount sont obligatoires.'
        });
      }

      const result = await engine.handlePhygitalStockUpdate({
        storeId,
        storeName,
        productId,
        quantitySold,
        newStockCount,
        cashierId,
        timestamp
      });

      return res.status(200).json(result);
    } catch (err) {
      console.error('[PHYGITAL SYNC ROUTE ERROR]', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Erreur interne lors de la synchronisation du stock physique'
      });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE REST : POST /api/live/push-product
  // Pousse un produit en direct via REST (alternative ou complément au socket)
  // --------------------------------------------------------------------------
  router.post('/push-product', async (req, res) => {
    try {
      const { roomId, product } = req.body;

      if (!roomId || !product) {
        return res.status(400).json({
          success: false,
          error: 'roomId et product sont requis.'
        });
      }

      const result = await engine.handleSellerPushProduct(roomId, product);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE REST : POST /api/live/buy-fast
  // Déclenche l'achat rapide Smart Escrow 1-clic
  // --------------------------------------------------------------------------
  router.post('/buy-fast', async (req, res) => {
    try {
      const result = await engine.handleBuyLiveProduct(req.body);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE REST : GET /api/live/rooms/:roomId
  // État actuel du salon Live et produit en vedette
  // --------------------------------------------------------------------------
  router.get('/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    const room = engine.rooms.get(roomId);

    if (!room) {
      return res.status(200).json({
        success: true,
        roomId,
        isLiveActive: false,
        viewersCount: 0,
        activeProduct: null
      });
    }

    return res.status(200).json({
      success: true,
      roomId,
      isLiveActive: true,
      viewersCount: room.viewersCount,
      activeProduct: room.activeProductData,
      currentStock: room.currentStock
    });
  });

  // --------------------------------------------------------------------------
  // ROUTE REST : GET /api/live/join

  // Traçabilité du lien d'affiliation quand un utilisateur rejoint ?ref=affiliateId
  // --------------------------------------------------------------------------
  router.get('/join', (req, res) => {
    const { liveId, roomId, userId, ref, affiliateId } = req.query;
    const effectiveRoomId = roomId || liveId || 'live_default';
    const effectiveAffiliateId = ref || affiliateId || null;

    if (effectiveAffiliateId) {
      console.log(`[LIVE COMMERCE JOIN] Tracking Micro-Relais : Spectateur ${userId || 'anon'} rattaché à l'affilié ${effectiveAffiliateId} pour ${effectiveRoomId}`);
    }

    return res.status(200).json({
      success: true,
      liveId: effectiveRoomId,
      trackedAffiliateId: effectiveAffiliateId,
      hasAffiliate: Boolean(effectiveAffiliateId),
      commissionRate: 5,
      message: effectiveAffiliateId
        ? `Lien d'affiliation Micro-Relais (${effectiveAffiliateId}) rattaché avec succès.`
        : 'Spectateur connecté au Live sans parrainage.'
    });
  });

  return router;

}

module.exports = {
  LiveCommerceEngine,
  createLiveCommerceRouter
};
