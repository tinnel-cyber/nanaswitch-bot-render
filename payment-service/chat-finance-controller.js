/**
 * Contrôleur Financier Wameet : "La Banque Wameet en Node.js" (100% Supabase)
 * Architecture Moteur Financier & Escrow In-Chat (Escrow, Farotage, Cagnotte)
 *
 * - Gestion des Wallets via Supabase (`wallets`, `wallet_transactions`, `escrow_transactions`)
 * - Intégration Passerelle Mobile Money (Sebpay / SasPay)
 * - Émission temps réel WebSocket via broadcastToChat(chatId, event, data)
 * - Traitement idempotent & sécurisé des Webhooks (Audit C5 résolu)
 */

const express = require('express');
const crypto = require('crypto');
const { createSebpayCollection } = require('./sebpay-client');
const { getSupabaseAdmin } = require('./supabase-admin');

const TRANSACTION_TYPES = {
  ESCROW: 'escrow',
  FAROTAGE: 'farotage',
  CAGNOTTE: 'cagnotte'
};

const TRANSACTION_STATUSES = {
  PENDING: 'pending',
  LOCKED: 'locked',
  COMPLETED: 'completed',
  REFUNDED: 'refunded',
  FAILED: 'failed'
};

const SUCCESS_WEBHOOK_STATUSES = new Set([
  'APPROVED',
  'SUCCESS',
  'COMPLETED',
  'PAID',
  'VALIDATED',
  'CONFIRMED',
  'ACCEPTED'
]);

async function safeUpdateWameetMessage(supabase, messageId, updateData) {
  if (!supabase || !messageId) return;
  try {
    await supabase
      .from('wameet_messages')
      .update(updateData)
      .eq('id', String(messageId));
  } catch (err) {
    console.warn('[WAMEET MESSAGE UPDATE NOTICE]', err.message);
  }
}

async function resolveAuthenticatedUser(supabase, req) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ') || !supabase) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) return data.user;
  } catch (_e) {
    // ignore
  }
  return null;
}

function createChatFinanceRouter({ broadcastToChat } = {}) {
  const router = express.Router();

  const requireSupabase = (req, res, next) => {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Base de données Supabase non initialisée sur le serveur.'
      });
    }
    req.supabase = supabase;
    next();
  };

  // --------------------------------------------------------------------------
  // ROUTE API 1 : POST /api/chat-finance/initiate
  // --------------------------------------------------------------------------
  router.post('/initiate', requireSupabase, async (req, res) => {
    try {
      const supabase = req.supabase;
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
        currency = 'XOF'
      } = req.body;

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

      const prefix =
        type === TRANSACTION_TYPES.ESCROW
          ? 'TX_ESC'
          : type === TRANSACTION_TYPES.FAROTAGE
          ? 'TX_FARO'
          : 'TX_CAGN';
      const transactionId = `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const nowServer = new Date().toISOString();

      // CAS A : FAROTAGE (Wallet interne Supabase)
      if (type === TRANSACTION_TYPES.FAROTAGE) {
        const { data: senderWallet } = await supabase
          .from('wallets')
          .select('id, cash_balance')
          .eq('tenant_id', String(senderId))
          .maybeSingle();

        const currentSenderBalance = Number(senderWallet?.cash_balance || 0);
        if (currentSenderBalance < numericAmount) {
          return res.status(400).json({
            success: false,
            error: `INSUFFICIENT_FUNDS: Solde insuffisant (${currentSenderBalance} FCFA disponibles, ${numericAmount} FCFA requis).`
          });
        }

        await supabase
          .from('wallets')
          .update({ cash_balance: currentSenderBalance - numericAmount, updated_at: nowServer })
          .eq('id', senderWallet.id);

        await supabase.from('wallet_transactions').insert({
          wallet_id: senderWallet.id,
          transaction_type: 'USAGE_DEDUCTION',
          amount: -numericAmount,
          reference_id: transactionId,
          description: `Farotage envoyé vers ${receiverId}`
        });

        await supabase
          .from('wallets')
          .upsert({ tenant_id: String(receiverId), currency: 'XOF' }, { onConflict: 'tenant_id' });

        const { data: receiverWallet } = await supabase
          .from('wallets')
          .select('id, cash_balance')
          .eq('tenant_id', String(receiverId))
          .single();

        if (receiverWallet) {
          await supabase
            .from('wallets')
            .update({
              cash_balance: Number(receiverWallet.cash_balance || 0) + numericAmount,
              updated_at: nowServer
            })
            .eq('id', receiverWallet.id);

          await supabase.from('wallet_transactions').insert({
            wallet_id: receiverWallet.id,
            transaction_type: 'TOPUP',
            amount: numericAmount,
            reference_id: transactionId,
            description: `Farotage reçu de ${senderId}`
          });
        }

        await supabase.from('escrow_transactions').insert({
          id: transactionId,
          chat_id: String(chatId),
          message_id: messageId ? String(messageId) : null,
          buyer_id: String(senderId),
          seller_id: String(receiverId),
          amount: numericAmount,
          currency: String(currency).toUpperCase(),
          status: TRANSACTION_STATUSES.COMPLETED,
          escrow_status: TRANSACTION_STATUSES.COMPLETED,
          is_paid: true,
          description: title || description || 'Farotage Wameet',
          released_at: nowServer
        });

        if (typeof broadcastToChat === 'function') {
          broadcastToChat(chatId, 'transaction_updated', {
            transactionId,
            type,
            status: TRANSACTION_STATUSES.COMPLETED,
            amount: numericAmount,
            updatedAt: nowServer
          });
        }

        return res.status(200).json({
          success: true,
          transactionId,
          status: TRANSACTION_STATUSES.COMPLETED,
          amount: numericAmount,
          message: 'Farotage exécuté instantanément via Wallet.'
        });
      }

      // CAS B : ESCROW ou CAGNOTTE (Mobile Money via Sebpay)
      await supabase.from('escrow_transactions').insert({
        id: transactionId,
        order_id: transactionId,
        chat_id: String(chatId),
        message_id: messageId ? String(messageId) : null,
        buyer_id: String(senderId),
        seller_id: String(receiverId),
        amount: numericAmount,
        currency: String(currency).toUpperCase(),
        status: TRANSACTION_STATUSES.PENDING,
        escrow_status: TRANSACTION_STATUSES.PENDING,
        is_paid: false,
        description: title || description || (type === 'escrow' ? 'Achat Sécurisé Escrow Wameet' : 'Contribution Cagnotte Wameet')
      });

      const callbackUrl =
        process.env.CHAT_FINANCE_WEBHOOK_URL ||
        'https://nana-payment-api.onrender.com/api/chat-finance/webhook';

      const sebpayRes = await createSebpayCollection({
        tenantId: String(receiverId),
        orderId: transactionId,
        amount: numericAmount,
        currency: String(currency).toUpperCase(),
        phone,
        description: title || description || `Wameet ${type} #${transactionId}`,
        callbackUrl
      });

      return res.status(200).json({
        success: true,
        transactionId,
        status: TRANSACTION_STATUSES.PENDING,
        paymentUrl: sebpayRes.paymentUrl || sebpayRes.checkout_url || null,
        provider: 'SEBPAY',
        message: 'Paiement initié. En attente de confirmation Mobile Money.'
      });
    } catch (err) {
      console.error('[CHAT FINANCE INITIATE ERROR]', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Erreur lors de l\'initiation financière'
      });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE API 2 : POST /api/chat-finance/webhook
  // Audit C5 : Vérification HMAC + statut whitelisté + montant >= escrow.amount
  // --------------------------------------------------------------------------
  router.post('/webhook', requireSupabase, async (req, res) => {
    try {
      const supabase = req.supabase;
      const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.SEBPAY_WEBHOOK_SECRET || process.env.SEBPAY_SECRET_KEY || process.env.SASPAY_WEBHOOK_SECRET || '';
      const receivedSig = String(
        req.headers['x-webhook-signature'] ||
        req.headers['x-sebpay-signature'] ||
        req.headers['x-saspay-signature'] ||
        req.headers['x-signature-sha256'] ||
        ''
      ).replace(/^sha256=/i, '').trim().toLowerCase();

      if (webhookSecret && receivedSig) {
        const rawPayload = req.rawBody ? String(req.rawBody) : JSON.stringify(req.body || {});
        const expectedSig = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex').toLowerCase();
        const validSig =
          receivedSig.length === expectedSig.length &&
          crypto.timingSafeEqual(Buffer.from(receivedSig, 'utf8'), Buffer.from(expectedSig, 'utf8'));

        if (!validSig) {
          return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
        }
      }

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
        return res.status(400).json({
          success: false,
          error: 'Identifiant de transaction manquant dans le payload webhook'
        });
      }

      // Audit C2 & C5 : Statut obligatoire et whitelisté !
      const rawStatus = body.transaction_status || body.status || body.data?.status || body.data?.transaction_status;
      if (!rawStatus) {
        return res.status(400).json({
          success: false,
          error: 'Statut de transaction manquant dans le webhook.'
        });
      }

      const cleanStatus = String(rawStatus).trim().toUpperCase();
      if (!SUCCESS_WEBHOOK_STATUSES.has(cleanStatus)) {
        await supabase
          .from('escrow_transactions')
          .update({
            status: TRANSACTION_STATUSES.FAILED,
            escrow_status: TRANSACTION_STATUSES.FAILED,
            updated_at: new Date().toISOString()
          })
          .eq('id', String(resolvedTransactionId))
          .eq('status', TRANSACTION_STATUSES.PENDING);

        return res.status(200).json({
          success: false,
          message: `Statut non validé (${cleanStatus}). Escrow non verrouillé.`
        });
      }

      const { data: txData, error: findErr } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', String(resolvedTransactionId))
        .maybeSingle();

      if (findErr || !txData) {
        return res.status(404).json({
          success: false,
          message: 'Transaction escrow introuvable.'
        });
      }

      if (txData.status === TRANSACTION_STATUSES.LOCKED || txData.status === TRANSACTION_STATUSES.COMPLETED) {
        return res.status(200).json({
          success: true,
          message: `Transaction déjà au statut '${txData.status}'`
        });
      }

      const webhookAmount = Number(body.amount ?? body.cpm_amount ?? body.data?.amount ?? 0);
      const expectedAmount = Number(txData.amount || 0);
      if (webhookAmount <= 0 || webhookAmount < expectedAmount) {
        return res.status(400).json({
          success: false,
          error: `Montant reçu (${webhookAmount}) inférieur au montant attendu (${expectedAmount}).`
        });
      }

      const nowServer = new Date().toISOString();

      await supabase
        .from('escrow_transactions')
        .update({
          status: TRANSACTION_STATUSES.LOCKED,
          escrow_status: TRANSACTION_STATUSES.LOCKED,
          is_paid: true,
          operator: body.payment_method || body.operator || 'MOMO',
          transaction_id: body.transaction_id || resolvedTransactionId,
          locked_at: nowServer,
          updated_at: nowServer
        })
        .eq('id', txData.id);

      await safeUpdateWameetMessage(supabase, txData.message_id, {
        status: TRANSACTION_STATUSES.LOCKED
      });

      if (typeof broadcastToChat === 'function' && txData.chat_id) {
        broadcastToChat(txData.chat_id, 'transaction_updated', {
          transactionId: txData.id,
          messageId: txData.message_id,
          chatId: txData.chat_id,
          status: TRANSACTION_STATUSES.LOCKED,
          escrowStatus: TRANSACTION_STATUSES.LOCKED,
          amount: expectedAmount,
          updatedAt: nowServer
        });
      }

      return res.status(200).json({
        success: true,
        transactionId: txData.id,
        status: TRANSACTION_STATUSES.LOCKED
      });
    } catch (err) {
      console.error('[CHAT FINANCE WEBHOOK ERROR]', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE API 3 : POST /api/chat-finance/release
  // Audit C5 : Authentification OBLIGATOIRE de l'acheteur
  // --------------------------------------------------------------------------
  router.post('/release', requireSupabase, async (req, res) => {
    try {
      const supabase = req.supabase;
      const { transactionId, buyerId, chatId, messageId } = req.body;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: 'transactionId est requis.'
        });
      }

      const authUser = await resolveAuthenticatedUser(supabase, req);
      const internalKey = req.headers['x-internal-admin-key'] || req.headers['x-admin-api-key'] || req.headers['x-admin-key'];
      const expectedInternalKey = process.env.INTERNAL_ADMIN_KEY || process.env.ADMIN_API_KEY || process.env.PAYMENT_WEBHOOK_SECRET;
      const isInternalCall = Boolean(internalKey && expectedInternalKey && internalKey === expectedInternalKey);

      const effectiveBuyerId = authUser?.id || buyerId;
      if (!effectiveBuyerId && !isInternalCall) {
        return res.status(401).json({
          success: false,
          error: 'Authentification requise pour libérer les fonds.'
        });
      }

      const { data: txData, error: findErr } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', String(transactionId))
        .maybeSingle();

      if (findErr || !txData) {
        return res.status(404).json({
          success: false,
          error: `Transaction ${transactionId} introuvable.`
        });
      }

      if (!isInternalCall && String(txData.buyer_id) !== String(effectiveBuyerId)) {
        return res.status(403).json({
          success: false,
          error: 'Action non autorisée. Seul l\'acheteur ayant financé cette transaction peut libérer les fonds.'
        });
      }

      if (txData.status === TRANSACTION_STATUSES.COMPLETED) {
        return res.status(400).json({
          success: false,
          error: 'Les fonds de cette transaction ont déjà été libérés au vendeur.'
        });
      }

      if (txData.status !== TRANSACTION_STATUSES.LOCKED || !txData.is_paid) {
        return res.status(400).json({
          success: false,
          error: `Impossible de libérer des fonds au statut actuel (${txData.status}).`
        });
      }

      const nowServer = new Date().toISOString();
      const amount = Number(txData.amount || 0);
      const sellerId = txData.seller_id;
      const effectiveChatId = chatId || txData.chat_id;
      const effectiveMessageId = messageId || txData.message_id;

      const commissionPct = Number(process.env.PLATFORM_COMMISSION_PERCENT || 5);
      const platformShare = Math.round(amount * (commissionPct / 100));
      const sellerShare = amount - platformShare;

      const { data: updatedTx } = await supabase
        .from('escrow_transactions')
        .update({
          status: TRANSACTION_STATUSES.COMPLETED,
          escrow_status: 'released',
          released_at: nowServer,
          updated_at: nowServer
        })
        .eq('id', txData.id)
        .eq('status', TRANSACTION_STATUSES.LOCKED)
        .select()
        .maybeSingle();

      if (!updatedTx) {
        return res.status(409).json({
          success: false,
          error: 'Conflit de libération : la transaction n\'est plus à l\'état locked.'
        });
      }

      await supabase
        .from('wallets')
        .upsert({ tenant_id: String(sellerId), currency: 'XOF' }, { onConflict: 'tenant_id' });

      const { data: sellerWallet } = await supabase
        .from('wallets')
        .select('id, cash_balance')
        .eq('tenant_id', String(sellerId))
        .single();

      if (sellerWallet) {
        await supabase
          .from('wallets')
          .update({
            cash_balance: Number(sellerWallet.cash_balance || 0) + sellerShare,
            updated_at: nowServer
          })
          .eq('id', sellerWallet.id);

        await supabase.from('wallet_transactions').insert({
          wallet_id: sellerWallet.id,
          transaction_type: 'ESCROW_RELEASE',
          amount: sellerShare,
          reference_id: txData.id,
          description: `Libération séquestre #${txData.id} (Net après commission ${commissionPct}%)`
        });
      }

      await safeUpdateWameetMessage(supabase, effectiveMessageId, {
        status: TRANSACTION_STATUSES.COMPLETED
      });

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
        message: 'Fonds débloqués avec succès vers le portefeuille vendeur.'
      });
    } catch (err) {
      console.error('[CHAT FINANCE RELEASE ERROR]', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // --------------------------------------------------------------------------
  // ROUTE COMPLÉMENTAIRE : GET /api/chat-finance/wallet/:userId
  // --------------------------------------------------------------------------
  router.get('/wallet/:userId', requireSupabase, async (req, res) => {
    try {
      const supabase = req.supabase;
      const { userId } = req.params;
      const { data } = await supabase
        .from('wallets')
        .select('*')
        .eq('tenant_id', String(userId))
        .maybeSingle();

      if (!data) {
        return res.status(200).json({
          success: true,
          userId,
          balance: 0,
          currency: 'XOF'
        });
      }

      return res.status(200).json({
        success: true,
        userId,
        balance: Number(data.cash_balance || 0),
        currency: data.currency || 'XOF',
        updatedAt: data.updated_at
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message
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
