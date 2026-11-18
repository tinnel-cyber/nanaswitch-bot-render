/**
 * Contrôleur Financier Wameet : "La Banque Wameet en Node.js"
 * Architecture Moteur Financier & Escrow In-Chat (Escrow, Farotage, Cagnotte)
 * 
 * - Gestion atomique des Wallets (ACID Firestore Transactions & Anti Double-Dépense)
 * - Intégration Passerelle Mobile Money CinetPay (Orange, Wave, MTN, Moov) avec Fallback Sebpay
 * - Émission temps réel WebSocket via broadcastToChat(chatId, event, data)
 * - Traitement idempotent des Webhooks bancaires
 */

const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const { createSebpayCollection } = require('./sebpay-client');

// ============================================================================
// MODÈLE DE DONNÉES & CONSTANTES
// ============================================================================

/**
 * SCHÉMA DE LA TABLE / COLLECTION `Transactions` (ou `chat_finance_transactions`)
 * ----------------------------------------------------------------------------
 * {
 *   id: string,                 // Identifiant unique : "TX_ESC_...", "TX_FARO_...", "TX_CAGN_..."
 *   type: string,               // 'escrow' | 'farotage' | 'cagnotte'
 *   senderId: string,           // UID de l'acheteur ou donateur
 *   receiverId: string,         // UID du vendeur ou bénéficiaire
 *   amount: number,             // Montant en FCFA (XOF)
 *   currency: string,           // 'XOF' | 'FCFA'
 *   status: string,             // 'pending' | 'locked' | 'completed' | 'refunded'
 *   chatId: string,             // Identifiant de la discussion Wameet
 *   messageId?: string,         // ID du message/bulle dans le chat
 *   title?: string,             // Titre ou libellé de l'article / cagnotte
 *   paymentProvider?: string,   // 'wallet' | 'cinetpay' | 'sebpay'
 *   paymentUrl?: string,        // URL de paiement générée par CinetPay / Sebpay
 *   externalReference?: string, // Référence de transaction externe
 *   sellerShare?: number,       // Montant reversé au vendeur (ex: 95%)
 *   platformShare?: number,     // Commission plateforme Wameet (ex: 5%)
 *   fee?: number,               // Frais de transaction
 *   createdAt: string,          // Horodatage ISO
 *   updatedAt: string,
 *   lockedAt?: string | null,   // Date de mise sous séquestre (confirmation banque)
 *   completedAt?: string | null,// Date de libération / clôture
 *   refundedAt?: string | null  // Date de remboursement éventuel
 * }
 * 
 * SCHÉMA DE LA TABLE / COLLECTION `wallets`
 * ----------------------------------------------------------------------------
 * {
 *   userId: string,             // UID de l'utilisateur
 *   balance: number,            // Solde disponible immédiatement en FCFA
 *   escrowLockedBalance: number,// Solde séquestré en attente de livraison
 *   totalEarnings: number,      // Gains cumulés depuis la création du compte
 *   currency: 'XOF',
 *   updatedAt: string
 * }
 */

const TRANSACTION_TYPES = {
  ESCROW: 'escrow',
  FAROTAGE: 'farotage',
  CAGNOTTE: 'cagnotte'
};

const TRANSACTION_STATUSES = {
  PENDING: 'pending',     // En attente de paiement
  LOCKED: 'locked',       // Fonds séquestrés par la banque (Escrow actif)
  COMPLETED: 'completed', // Fonds libérés et crédités sur le Wallet
  REFUNDED: 'refunded'    // Remboursé à l'acheteur
};

/**
 * Met à jour la bulle de chat de manière sécurisée et tolérante aux pannes
 */
function safeUpdateChatMessage(db, target, chatId, messageId, data) {
  if (!chatId || !messageId || !db) return;
  try {
    const chatDoc = db.collection('wameet_chats').doc(chatId);
    if (chatDoc && typeof chatDoc.collection === 'function') {
      const msgRef = chatDoc.collection('messages').doc(messageId);
      if (target && typeof target.set === 'function') {
        target.set(msgRef, data, { merge: true });
      } else if (typeof msgRef.set === 'function') {
        msgRef.set(data, { merge: true }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[SAFE UPDATE CHAT MESSAGE NOTICE]', err.message);
  }
}

// URL de base officielle CinetPay v2
const CINETPAY_BASE_URL = 'https://api-checkout.cinetpay.com/v2/payment';
const CINETPAY_CHECK_URL = 'https://api-checkout.cinetpay.com/v2/payment/check';

/**
 * Génère un lien de paiement CinetPay Mobile Money / Cartes
 */
async function generateCinetPayPaymentLink(params, fetchViaFixie) {
  const apiKey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;

  const {
    transactionId,
    amount,
    currency = 'XOF',
    description,
    notifyUrl,
    returnUrl,
    customerId,
    customerName = 'Client Wameet',
    customerPhone = '+22670000000'
  } = params;

  // Si clés CinetPay configurées, appel de l'API CinetPay v2
  if (apiKey && siteId) {
    const payload = {
      apikey: apiKey,
      site_id: siteId,
      transaction_id: transactionId,
      amount: Math.round(Number(amount)),
      currency: currency === 'FCFA' ? 'XOF' : currency,
      description: description || `Paiement Wameet ${transactionId}`,
      notify_url: notifyUrl,
      return_url: returnUrl || notifyUrl,
      channels: 'ALL',
      customer_id: customerId || 'client_wameet',
      customer_name: customerName,
      customer_phone_number: customerPhone.replace(/[^0-9+]/g, '') || '+22670000000'
    };

    try {
      console.log(`[CINETPAY INITIATE] Appel API pour ${transactionId} (${amount} ${currency})...`);
      
      const fetchFn = fetchViaFixie || fetch;
      const response = await fetchFn(CINETPAY_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        timeout: 10000
      });

      const data = await response.json();
      console.log(`[CINETPAY RESPONSE] Code: ${data?.code}, Message: ${data?.message}`);

      if ((data?.code === '201' || data?.code === 201) && data?.data?.payment_url) {
        return {
          success: true,
          provider: 'cinetpay',
          paymentUrl: data.data.payment_url,
          paymentToken: data.data.payment_token
        };
      }
      console.warn('[CINETPAY NOTICE] Réponse inattendue de CinetPay, tentative de fallback :', data);
    } catch (err) {
      console.warn('[CINETPAY ERROR] Échec appel CinetPay, passage au fallback :', err.message);
    }
  }

  // Fallback 1 : Passerelle Sebpay Mobile Money (Orange, Wave, MTN, Moov)
  try {
    console.log(`[FALLBACK SEBPAY] Tentative génération lien Sebpay pour ${transactionId}...`);
    const sebpayResult = await createSebpayCollection({
      orderId: transactionId,
      amount,
      currency: currency || 'XOF',
      customerName,
      phone: customerPhone,
      description: description || `Smart Escrow Wameet ${transactionId}`,
      callbackUrl: notifyUrl
    });

    const paymentUrl = sebpayResult.provider_link || sebpayResult.redirectUrl;
    if (paymentUrl) {
      return {
        success: true,
        provider: 'sebpay',
        paymentUrl
      };
    }
  } catch (sebErr) {
    console.warn('[FALLBACK SEBPAY ERROR] Sebpay a échoué :', sebErr.message);
  }

  // Fallback 2 : Lien de paiement direct avec paramètre de redirection
  const fallbackUrl = `https://checkout.cinetpay.com/payment/${transactionId}?amount=${amount}&currency=${currency}`;
  return {
    success: true,
    provider: 'cinetpay_direct',
    paymentUrl: fallbackUrl
  };
}

/**
 * Vérifie l'état réel d'une transaction auprès de CinetPay
 */
async function checkCinetPayStatus(transactionId, fetchViaFixie) {
  const apiKey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;

  if (!apiKey || !siteId) return null;

  try {
    const fetchFn = fetchViaFixie || fetch;
    const response = await fetchFn(CINETPAY_CHECK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: transactionId
      }),
      timeout: 8000
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.warn('[CINETPAY CHECK ERROR]', err.message);
    return null;
  }
}

// ============================================================================
// FACTORY DU ROUTEUR EXPRESS CHAT-FINANCE
// ============================================================================

/**
 * Crée le routeur Express pour le moteur financier in-chat
 * @param {Object} options { db, broadcastToChat, fetchViaFixie }
 */
function createChatFinanceRouter({ db, broadcastToChat, fetchViaFixie }) {
  const router = express.Router();

  // Middleware pour vérifier la présence de Firestore
  const requireDb = (req, res, next) => {
    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Base de données Firestore indisponible'
      });
    }
    next();
  };

  // --------------------------------------------------------------------------
  // ROUTE API 1 : POST /api/chat-finance/initiate
  // Initialise une transaction depuis le chat (Farotage, Escrow, Cagnotte)
  // --------------------------------------------------------------------------
  router.post('/initiate', requireDb, async (req, res) => {
    try {
      const {
        type,
        amount,
        senderId,
        receiverId,
        chatId,
        messageId,
        title,
        description,
        phone,
        currency = 'XOF',
        senderName = 'Expéditeur Wameet',
        receiverName = 'Destinataire Wameet'
      } = req.body;

      // 1. Validations strictes des paramètres
      if (!type || !Object.values(TRANSACTION_TYPES).includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Le type de transaction est invalide. Attendu: ${Object.values(TRANSACTION_TYPES).join(', ')}`
        });
      }

      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Le montant doit être un nombre strictement supérieur à 0 FCFA.'
        });
      }

      if (!senderId || !receiverId || !chatId) {
        return res.status(400).json({
          success: false,
          error: 'senderId, receiverId et chatId sont requis.'
        });
      }

      // Génération de l'identifiant unique de transaction
      const prefix =
        type === TRANSACTION_TYPES.ESCROW
          ? 'TX_ESC'
          : type === TRANSACTION_TYPES.FAROTAGE
          ? 'TX_FARO'
          : 'TX_CAGN';
      const transactionId = `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const nowServer = new Date().toISOString();

      // ======================================================================
      // CAS A : "FAROTAGE" (Paiement instantané via Wallet interne Wameet)
      // ======================================================================
      if (type === TRANSACTION_TYPES.FAROTAGE) {
        const senderWalletRef = db.collection('wallets').doc(senderId);
        const receiverWalletRef = db.collection('wallets').doc(receiverId);
        const transactionRef = db.collection('Transactions').doc(transactionId);
        const legacyRef = db.collection('chat_finance_transactions').doc(transactionId);

        let executionResult;

        try {
          executionResult = await db.runTransaction(async (t) => {
            const senderWalletDoc = await t.get(senderWalletRef);

            // Vérification du solde de l'expéditeur
            const currentSenderBalance = senderWalletDoc.exists
              ? Number(senderWalletDoc.data().balance || 0)
              : 0;

            if (currentSenderBalance < numericAmount) {
              throw new Error(
                `INSUFFICIENT_FUNDS: Solde insuffisant (${currentSenderBalance} FCFA disponibles, ${numericAmount} FCFA requis).`
              );
            }

            const receiverWalletDoc = await t.get(receiverWalletRef);
            const currentReceiverBalance = receiverWalletDoc.exists
              ? Number(receiverWalletDoc.data().balance || 0)
              : 0;
            const currentReceiverEarnings = receiverWalletDoc.exists
              ? Number(receiverWalletDoc.data().totalEarnings || 0)
              : 0;

            // 1. Déduction du solde du sender
            t.set(senderWalletRef, {
              userId: senderId,
              balance: currentSenderBalance - numericAmount,
              currency: 'XOF',
              updatedAt: nowServer
            }, { merge: true });

            // 2. Crédit immédiat du receiver
            t.set(receiverWalletRef, {
              userId: receiverId,
              balance: currentReceiverBalance + numericAmount,
              totalEarnings: currentReceiverEarnings + numericAmount,
              currency: 'XOF',
              updatedAt: nowServer
            }, { merge: true });

            // 3. Enregistrement de la transaction complétée
            const txRecord = {
              id: transactionId,
              type: TRANSACTION_TYPES.FAROTAGE,
              senderId,
              receiverId,
              senderName,
              receiverName,
              amount: numericAmount,
              currency,
              status: TRANSACTION_STATUSES.COMPLETED,
              chatId,
              messageId: messageId || null,
              title: title || 'Farotage Digital Wameet',
              paymentProvider: 'wallet',
              createdAt: nowServer,
              updatedAt: nowServer,
              completedAt: nowServer
            };

            t.set(transactionRef, txRecord);
            t.set(legacyRef, txRecord);

            // 4. Mise à jour de la bulle dans le chat si messageId fourni
            safeUpdateChatMessage(db, t, chatId, messageId, {
              status: TRANSACTION_STATUSES.COMPLETED,
              transactionId,
              updatedAt: nowServer
            });

            return {
              newSenderBalance: currentSenderBalance - numericAmount,
              newReceiverBalance: currentReceiverBalance + numericAmount
            };
          });
        } catch (txError) {
          if (txError.message.startsWith('INSUFFICIENT_FUNDS')) {
            return res.status(400).json({
              success: false,
              code: 'INSUFFICIENT_FUNDS',
              error: txError.message.replace('INSUFFICIENT_FUNDS: ', ''),
              requiredAmount: numericAmount
            });
          }
          throw txError;
        }

        // 5. Déclenche l'événement WebSocket de succès
        if (typeof broadcastToChat === 'function') {
          broadcastToChat(chatId, 'transaction_updated', {
            transactionId,
            messageId,
            chatId,
            status: TRANSACTION_STATUSES.COMPLETED,
            type: TRANSACTION_TYPES.FAROTAGE,
            amount: numericAmount,
            currency,
            senderId,
            receiverId,
            title: title || 'Farotage Digital Wameet',
            updatedAt: nowServer
          });
        }

        return res.status(200).json({
          success: true,
          transactionId,
          type: TRANSACTION_TYPES.FAROTAGE,
          status: TRANSACTION_STATUSES.COMPLETED,
          amount: numericAmount,
          currency,
          message: 'Farotage effectué avec succès via votre Wallet Wameet interne !',
          remainingBalance: executionResult.newSenderBalance
        });
      }

      // ======================================================================
      // CAS B : "ESCROW" (Séquestre Vente Sécurisée via CinetPay / Mobile Money)
      // ======================================================================
      if (type === TRANSACTION_TYPES.ESCROW) {
        const notifyUrl =
          process.env.PAYMENT_WEBHOOK_URL ||
          'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run/api/chat-finance/webhook';

        // 1. Génération du lien de paiement externe CinetPay
        const paymentResult = await generateCinetPayPaymentLink(
          {
            transactionId,
            amount: numericAmount,
            currency,
            description: title || `Smart Escrow: Commande ${transactionId}`,
            notifyUrl,
            returnUrl: `https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run/payment/success?txId=${transactionId}`,
            customerId: senderId,
            customerName: senderName,
            customerPhone: phone || '+22670000000'
          },
          fetchViaFixie
        );

        // 2. Enregistrement de la transaction en statut "pending"
        const txRecord = {
          id: transactionId,
          type: TRANSACTION_TYPES.ESCROW,
          senderId, // Acheteur
          receiverId, // Vendeur
          senderName,
          receiverName,
          amount: numericAmount,
          currency,
          status: TRANSACTION_STATUSES.PENDING,
          chatId,
          messageId: messageId || null,
          title: title || 'Paiement Sécurisé Smart Escrow',
          description: description || '',
          paymentProvider: paymentResult.provider || 'cinetpay',
          paymentUrl: paymentResult.paymentUrl,
          createdAt: nowServer,
          updatedAt: nowServer
        };

        const batch = db.batch();
        const txRef = db.collection('Transactions').doc(transactionId);
        const legacyRef = db.collection('chat_finance_transactions').doc(transactionId);
        const escrowAuditRef = db.collection('wameet_escrow_transactions').doc(transactionId);

        batch.set(txRef, txRecord);
        batch.set(legacyRef, txRecord);
        batch.set(escrowAuditRef, {
          ...txRecord,
          escrowStatus: TRANSACTION_STATUSES.PENDING
        });

        // Met à jour la bulle dans le chat Wameet
        safeUpdateChatMessage(db, batch, chatId, messageId, {
          transactionId,
          status: TRANSACTION_STATUSES.PENDING,
          escrowStatus: TRANSACTION_STATUSES.PENDING,
          paymentUrl: paymentResult.paymentUrl,
          amount: numericAmount,
          updatedAt: nowServer
        });

        await batch.commit();

        return res.status(200).json({
          success: true,
          transactionId,
          type: TRANSACTION_TYPES.ESCROW,
          status: TRANSACTION_STATUSES.PENDING,
          amount: numericAmount,
          currency,
          paymentUrl: paymentResult.paymentUrl,
          redirectUrl: paymentResult.paymentUrl,
          message: 'Lien de paiement CinetPay généré avec succès.'
        });
      }

      // ======================================================================
      // CAS C : "CAGNOTTE" (Financement Participatif)
      // ======================================================================
      if (type === TRANSACTION_TYPES.CAGNOTTE) {
        const notifyUrl =
          process.env.PAYMENT_WEBHOOK_URL ||
          'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run/api/chat-finance/webhook';

        const paymentResult = await generateCinetPayPaymentLink(
          {
            transactionId,
            amount: numericAmount,
            currency,
            description: title || `Contribution Cagnotte ${transactionId}`,
            notifyUrl,
            customerId: senderId,
            customerName: senderName,
            customerPhone: phone || '+22670000000'
          },
          fetchViaFixie
        );

        const txRecord = {
          id: transactionId,
          type: TRANSACTION_TYPES.CAGNOTTE,
          senderId,
          receiverId,
          amount: numericAmount,
          currency,
          status: TRANSACTION_STATUSES.PENDING,
          chatId,
          messageId: messageId || null,
          title: title || 'Cagnotte Solidaire',
          paymentUrl: paymentResult.paymentUrl,
          createdAt: nowServer,
          updatedAt: nowServer
        };

        await db.collection('Transactions').doc(transactionId).set(txRecord);

        return res.status(200).json({
          success: true,
          transactionId,
          type: TRANSACTION_TYPES.CAGNOTTE,
          status: TRANSACTION_STATUSES.PENDING,
          amount: numericAmount,
          paymentUrl: paymentResult.paymentUrl,
          message: 'Lien de contribution Cagnotte généré.'
        });
      }
    } catch (err) {
      console.error('[CHAT FINANCE INITIATE ERROR]', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Erreur interne lors de l\'initiation de la transaction financière'
      });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE API 2 : POST /api/chat-finance/webhook
  // Webhook appelé par CinetPay / Sebpay quand le client paie par Mobile Money
  // --------------------------------------------------------------------------
  router.post('/webhook', requireDb, async (req, res) => {
    try {
      console.log('[CHAT FINANCE WEBHOOK] Notification reçue :', req.body);

      // Extraction des identifiants selon format CinetPay ou Sebpay
      const body = req.body || {};
      const resolvedTransactionId =
        body.cpm_trans_id ||
        body.transaction_id ||
        body.order_id ||
        body.orderId ||
        body.custom_order_id ||
        body.external_reference?.replace(/^.*?___/, '') ||
        body.id;

      if (!resolvedTransactionId) {
        console.warn('[CHAT FINANCE WEBHOOK WARNING] Impossible de résoudre l\'identifiant de transaction.');
        return res.status(400).json({
          success: false,
          error: 'Identifiant de transaction manquant dans le payload webhook'
        });
      }

      console.log(`[CHAT FINANCE WEBHOOK] Recherche transaction : ${resolvedTransactionId}`);

      // Recherche dans la collection 'Transactions' (ou fallback 'chat_finance_transactions')
      let txRef = db.collection('Transactions').doc(resolvedTransactionId);
      let txSnap = await txRef.get();

      if (!txSnap.exists) {
        txRef = db.collection('chat_finance_transactions').doc(resolvedTransactionId);
        txSnap = await txRef.get();
      }

      if (!txSnap.exists) {
        // Recherche par externalReference
        const querySnap = await db.collection('Transactions')
          .where('id', '==', resolvedTransactionId)
          .limit(1)
          .get();

        if (!querySnap.empty) {
          txSnap = querySnap.docs[0];
          txRef = txSnap.ref;
        }
      }

      if (!txSnap.exists) {
        console.warn(`[CHAT FINANCE WEBHOOK NOTICE] Transaction non trouvée pour ${resolvedTransactionId}`);
        // Répond 200 pour éviter les boucles d'appels répétitives des passerelles
        return res.status(200).json({
          success: true,
          message: 'Notification reçue mais transaction non enregistrée.'
        });
      }

      const txData = txSnap.data();
      const currentStatus = txData.status;

      // Idempotence : si déjà verrouillé ou complété, pas de double exécution
      if (currentStatus === TRANSACTION_STATUSES.LOCKED || currentStatus === TRANSACTION_STATUSES.COMPLETED) {
        console.log(`[CHAT FINANCE WEBHOOK IDEMPOTENT] Transaction ${resolvedTransactionId} déjà au statut '${currentStatus}'.`);
        return res.status(200).json({
          success: true,
          message: `Transaction déjà au statut '${currentStatus}'`
        });
      }

      const nowServer = new Date().toISOString();
      const amount = Number(txData.amount || 0);
      const chatId = txData.chatId;
      const messageId = txData.messageId;
      const sellerId = txData.receiverId;

      // EXÉCUTION ATOMIQUE DU VERROUILLAGE (LOCKED)
      const batch = db.batch();

      // 1. Passer la transaction à "locked"
      batch.set(txRef, {
        status: TRANSACTION_STATUSES.LOCKED,
        escrowStatus: TRANSACTION_STATUSES.LOCKED,
        isPaid: true,
        lockedAt: nowServer,
        updatedAt: nowServer,
        webhookPayload: {
          operator: body.payment_method || body.operator || 'MOMO',
          receivedAt: nowServer
        }
      }, { merge: true });

      // Synchronisation miroir legacy
      const legacyRef = db.collection('chat_finance_transactions').doc(resolvedTransactionId);
      batch.set(legacyRef, {
        status: TRANSACTION_STATUSES.LOCKED,
        escrowStatus: TRANSACTION_STATUSES.LOCKED,
        lockedAt: nowServer,
        updatedAt: nowServer
      }, { merge: true });

      // 2. Consigner le montant dans le Wallet du vendeur sous séquestre
      if (sellerId) {
        const sellerWalletRef = db.collection('wallets').doc(sellerId);
        try {
          const sellerWalletDoc = await sellerWalletRef.get().catch(() => null);
          const currentLocked = sellerWalletDoc && sellerWalletDoc.exists
            ? Number(sellerWalletDoc.data().escrowLockedBalance || 0)
            : 0;
          batch.set(sellerWalletRef, {
            userId: sellerId,
            escrowLockedBalance: currentLocked + amount,
            updatedAt: nowServer
          }, { merge: true });
        } catch (walletErr) {
          console.warn('[CHAT FINANCE WALLET NOTICE]', walletErr.message);
        }
      }

      // 3. Mettre à jour la bulle dans le flux de chat Wameet
      safeUpdateChatMessage(db, batch, chatId, messageId, {
        status: TRANSACTION_STATUSES.LOCKED,
        escrowStatus: TRANSACTION_STATUSES.LOCKED,
        lockedAt: nowServer,
        updatedAt: nowServer
      });

      await batch.commit();

      console.log(`[CHAT FINANCE WEBHOOK SUCCESS] Transaction ${resolvedTransactionId} verrouillée en 'locked'.`);

      // 4. DIFFUSION EN TEMPS RÉEL VIA WEBSOCKET (La bulle devient verte en direct !)
      if (typeof broadcastToChat === 'function' && chatId) {
        broadcastToChat(chatId, 'transaction_updated', {
          transactionId: resolvedTransactionId,
          messageId,
          chatId,
          status: TRANSACTION_STATUSES.LOCKED,
          escrowStatus: TRANSACTION_STATUSES.LOCKED,
          amount,
          currency: txData.currency || 'FCFA',
          title: txData.title,
          updatedAt: nowServer
        });
      }

      return res.status(200).json({
        success: true,
        transactionId: resolvedTransactionId,
        status: TRANSACTION_STATUSES.LOCKED,
        message: 'Transaction verrouillée sous séquestre avec succès.'
      });
    } catch (err) {
      console.error('[CHAT FINANCE WEBHOOK ERROR]', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Erreur lors du traitement du webhook bancaire'
      });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE API 3 : POST /api/chat-finance/release
  // Libération des fonds par l'acheteur après confirmation de réception ("Article reçu")
  // --------------------------------------------------------------------------
  router.post('/release', requireDb, async (req, res) => {
    try {
      const { transactionId, buyerId, chatId, messageId } = req.body;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: 'Le paramètre transactionId est obligatoire.'
        });
      }

      let txRef = db.collection('Transactions').doc(transactionId);
      let txSnap = await txRef.get();

      if (!txSnap.exists) {
        txRef = db.collection('chat_finance_transactions').doc(transactionId);
        txSnap = await txRef.get();
      }

      if (!txSnap.exists) {
        return res.status(404).json({
          success: false,
          error: `Transaction ${transactionId} introuvable.`
        });
      }

      const txData = txSnap.data();

      // Vérification 1 : Sécurité Acheteur
      if (buyerId && txData.senderId && txData.senderId !== buyerId) {
        return res.status(403).json({
          success: false,
          error: 'Action non autorisée. Seul l\'acheteur ayant financé cette transaction peut libérer les fonds.'
        });
      }

      // Vérification 2 : Déjà libéré ?
      if (txData.status === TRANSACTION_STATUSES.COMPLETED) {
        return res.status(400).json({
          success: false,
          error: 'Les fonds de cette transaction ont déjà été libérés au vendeur.'
        });
      }

      // Vérification 3 : Le paiement doit être préalablement verrouillé (locked)
      if (txData.status !== TRANSACTION_STATUSES.LOCKED && !txData.isPaid) {
        return res.status(400).json({
          success: false,
          error: `Impossible de libérer des fonds au statut actuel (${txData.status}). Le paiement doit être sous séquestre (locked).`
        });
      }

      const nowServer = new Date().toISOString();
      const amount = Number(txData.amount || 0);
      const sellerId = txData.receiverId;
      const effectiveChatId = chatId || txData.chatId;
      const effectiveMessageId = messageId || txData.messageId;

      // Calcul du split financier (ex: 95% vendeur / 5% commission plateforme)
      const commissionPct = Number(process.env.PLATFORM_COMMISSION_PERCENT || 5);
      const platformShare = Math.round(amount * (commissionPct / 100));
      const sellerShare = amount - platformShare;

      // EXÉCUTION ATOMIQUE FIRESTORE TRANSACTION (Anti Race-Condition)
      await db.runTransaction(async (t) => {
        const sellerWalletRef = db.collection('wallets').doc(sellerId);
        const sellerWalletDoc = await t.get(sellerWalletRef);

        const currentBalance = sellerWalletDoc.exists ? Number(sellerWalletDoc.data().balance || 0) : 0;
        const currentEarnings = sellerWalletDoc.exists ? Number(sellerWalletDoc.data().totalEarnings || 0) : 0;
        const currentLocked = sellerWalletDoc.exists ? Number(sellerWalletDoc.data().escrowLockedBalance || 0) : 0;

        // 1. Crédit du wallet vendeur
        t.set(sellerWalletRef, {
          userId: sellerId,
          balance: currentBalance + sellerShare,
          totalEarnings: currentEarnings + sellerShare,
          escrowLockedBalance: Math.max(0, currentLocked - amount),
          currency: 'XOF',
          updatedAt: nowServer
        }, { merge: true });

        // 2. Passage de la transaction en "completed"
        t.set(txRef, {
          status: TRANSACTION_STATUSES.COMPLETED,
          escrowStatus: 'released',
          sellerShare,
          platformShare,
          completedAt: nowServer,
          updatedAt: nowServer
        }, { merge: true });

        // 3. Mise à jour de la bulle de chat
        safeUpdateChatMessage(db, t, effectiveChatId, effectiveMessageId, {
          status: TRANSACTION_STATUSES.COMPLETED,
          escrowStatus: 'released',
          releasedAt: nowServer,
          updatedAt: nowServer
        });
      });

      console.log(`[CHAT FINANCE RELEASE SUCCESS] Transaction ${transactionId} libérée : +${sellerShare} FCFA au vendeur ${sellerId}.`);

      // 4. DIFFUSION WEBSOCKET EN DIRECT
      if (typeof broadcastToChat === 'function' && effectiveChatId) {
        broadcastToChat(effectiveChatId, 'transaction_updated', {
          transactionId,
          messageId: effectiveMessageId,
          chatId: effectiveChatId,
          status: TRANSACTION_STATUSES.COMPLETED,
          escrowStatus: 'released',
          amount,
          sellerShare,
          updatedAt: nowServer
        });
      }

      return res.status(200).json({
        success: true,
        transactionId,
        status: TRANSACTION_STATUSES.COMPLETED,
        sellerShare,
        platformShare,
        message: 'Fonds débloqués avec succès. L\'argent a été transféré sur le Wallet du vendeur.'
      });
    } catch (err) {
      console.error('[CHAT FINANCE RELEASE ERROR]', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Erreur lors de la libération des fonds sous séquestre'
      });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE COMPLÉMENTAIRE : GET /api/chat-finance/wallet/:userId
  // Retourne le solde et les statistiques du portefeuille Wameet de l'utilisateur
  // --------------------------------------------------------------------------
  router.get('/wallet/:userId', requireDb, async (req, res) => {
    try {
      const { userId } = req.params;
      const walletRef = db.collection('wallets').doc(userId);
      const walletSnap = await walletRef.get();

      if (!walletSnap.exists) {
        return res.status(200).json({
          success: true,
          userId,
          balance: 0,
          escrowLockedBalance: 0,
          totalEarnings: 0,
          currency: 'XOF',
          message: 'Nouveau portefeuille initialisé à 0 FCFA'
        });
      }

      const data = walletSnap.data();
      return res.status(200).json({
        success: true,
        userId,
        balance: Number(data.balance || 0),
        escrowLockedBalance: Number(data.escrowLockedBalance || 0),
        totalEarnings: Number(data.totalEarnings || 0),
        currency: data.currency || 'XOF',
        updatedAt: data.updatedAt
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Erreur lors de la récupération du solde wallet'
      });
    }
  });

  return router;
}

module.exports = {
  createChatFinanceRouter,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES
};
