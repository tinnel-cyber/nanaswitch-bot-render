/**
 * Sécurité des paiements Nanasore (serveur uniquement)
 * -----------------------------------------------------------------------------
 * 1. requireAccountOwner : exige un jeton Bearer valide et vérifie que l'appelant
 *    est bien propriétaire de l'univers / du compte ciblé.
 * 2. Intentions de paiement serveur : l'identifiant de commande (orderId) est
 *    généré ET lié au propriétaire côté serveur AVANT l'ouverture du checkout.
 *    Impossible de « réclamer » le paiement d'un tiers.
 * 3. verifyPayment : un crédit n'est accordé qu'après confirmation par une source
 *    serveur de confiance (jamais par le navigateur) :
 *      a) webhook signé HMAC reçu par ce serveur,
 *      b) journal des paiements du routeur (écrit uniquement en service role),
 *      c) API de vérification du routeur multi-agrégateurs (serveur-à-serveur).
 *    Le montant et la devise crédités sont ceux CONFIRMÉS par le routeur.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type express from 'express';

export type PaymentPurpose = 'WALLET_RECHARGE' | 'SUBSCRIPTION';

export interface PaymentIntent {
  orderId: string;
  purpose: PaymentPurpose;
  ownerUserId: string;
  universeId: string;
  userId: string;
  amount: number;
  currency: string;
  planId?: string;
  planName?: string;
  billingCycle?: string;
  customerEmail?: string;
  status: 'AWAITING_PAYMENT' | 'SETTLED' | 'FAILED' | 'EXPIRED';
  verifiedAmount?: number;
  verifiedTransactionId?: string;
  verificationSource?: string;
  settlement?: any;
  attempts?: number;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerifiedPayment {
  verified: boolean;
  status: 'PAID' | 'PENDING' | 'FAILED';
  amount: number;
  currency: string;
  transactionId: string;
  source: string;
  reason?: string;
}

export interface AccountContext {
  universeId: string;
  userId: string;
  authUserId: string;
  isAdmin: boolean;
}

interface Deps {
  dataDir: string;
  getSupabaseAdmin: () => any;
  resolveUser: (req: express.Request) => Promise<any | null>;
  isAdminUser: (user: any) => Promise<boolean> | boolean;
}

const PAID_STATUSES = ['PAID', 'COMPLETED', 'SUCCESS', 'SUCCESSFUL', 'APPROVED', 'VALIDATED', 'CONFIRMED'];
const FAILED_STATUSES = ['FAILED', 'CANCELLED', 'CANCELED', 'REJECTED', 'EXPIRED', 'DECLINED'];

// Prix plancher serveur des abonnements (F CFA) — aligné sur tous les plans frontend (NewDashboardApp + SubscriptionPaywallModal)
const SERVER_PLAN_PRICES: Record<string, { MONTHLY: number; ANNUAL: number }> = {
  starter: { MONTHLY: 5000, ANNUAL: 50000 },
  pro: { MONTHLY: 10000, ANNUAL: 100000 },
  business: { MONTHLY: 30000, ANNUAL: 300000 },
  elite: { MONTHLY: 20000, ANNUAL: 200000 },
  enterprise: { MONTHLY: 60000, ANNUAL: 600000 },
  custom_modular: { MONTHLY: 5000, ANNUAL: 48000 },
};

export function getServerPlanMinPrice(planId: string, billingCycle: string): number | null {
  const plan = SERVER_PLAN_PRICES[String(planId || '').toLowerCase()];
  if (!plan) return null;
  return String(billingCycle).toUpperCase() === 'ANNUAL' ? plan.ANNUAL : plan.MONTHLY;
}

export function deterministicId(prefix: string, seed: string): string {
  return `${prefix}-${crypto.createHash('sha256').update(String(seed)).digest('hex').slice(0, 24).toUpperCase()}`;
}

export function createPaymentSecurity(deps: Deps) {
  const INTENTS_FILE = path.join(deps.dataDir, 'payment_intents_server.json');
  const CONFIRMED_FILE = path.join(deps.dataDir, 'confirmed_payments.json');
  const locks = new Set<string>();

  const readArr = (file: string): any[] => {
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.error('[PAYMENT SECURITY] Lecture impossible', file, (err as Error).message);
    }
    return [];
  };
  const writeArr = (file: string, items: any[]) => {
    try {
      if (!fs.existsSync(deps.dataDir)) fs.mkdirSync(deps.dataDir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(items.slice(0, 10000), null, 2), 'utf-8');
    } catch (err) {
      console.error('[PAYMENT SECURITY] Écriture impossible', file, (err as Error).message);
    }
  };

  // ---------------------------------------------------------------------------
  // 1. AUTHENTIFICATION + CONTRÔLE PROPRIÉTAIRE
  // ---------------------------------------------------------------------------
  const isInternalCall = (req: express.Request): boolean => {
    const secret = process.env.ADMIN_API_KEY || process.env.INTERNAL_API_SECRET || '';
    const provided = String(req.headers['x-admin-api-key'] || req.headers['x-internal-secret'] || '');
    if (!secret || !provided) return false;
    const a = Buffer.from(secret, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  const userOwnsUniverse = async (authUserId: string, universeId: string): Promise<boolean> => {
    if (!universeId) return false;
    if (universeId === authUserId) return true;
    const supa = deps.getSupabaseAdmin();
    if (!supa) return false;
    try {
      const { data } = await supa.from('universes').select('*').eq('id', universeId).maybeSingle();
      if (data) {
        const owners = [
          data.user_id,
          data.owner_id,
          data.owner_uid,
          data.uid,
          data.merchant_id,
          data.settings?.owner_id,
          data.settings?.user_id,
        ].map((v: any) => String(v || ''));
        if (owners.includes(authUserId)) return true;
      }
    } catch {}
    try {
      const { data } = await supa.from('merchants').select('*').eq('id', universeId).maybeSingle();
      if (data) {
        const owners = [data.user_id, data.owner_id, data.owner_uid, data.uid].map((v: any) => String(v || ''));
        if (owners.includes(authUserId)) return true;
      }
    } catch {}
    return false;
  };

  /**
   * Exige un Bearer JWT valide et vérifie la propriété du compte.
   * Renvoie le contexte, ou null si une réponse d'erreur a déjà été envoyée.
   */
  const requireAccountOwner = async (
    req: express.Request,
    res: express.Response,
    ids: { universeId?: any; userId?: any }
  ): Promise<AccountContext | null> => {
    const universeId = String(ids.universeId || '').trim();
    const userId = String(ids.userId || '').trim();

    if (isInternalCall(req)) {
      return { universeId, userId, authUserId: userId || 'internal', isAdmin: true };
    }

    const user = await deps.resolveUser(req);
    if (!user?.id) {
      res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Session expirée ou absente. Veuillez vous reconnecter.' });
      return null;
    }
    const authUserId = String(user.id);
    const isAdmin = Boolean(await deps.isAdminUser(user));

    if (!universeId && !userId) {
      return { universeId: '', userId: authUserId, authUserId, isAdmin };
    }
    if (isAdmin) {
      return { universeId, userId: userId || authUserId, authUserId, isAdmin };
    }
    if (userId && userId !== authUserId) {
      res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'Accès refusé : ce compte ne vous appartient pas.' });
      return null;
    }
    if (universeId) {
      if (!deps.getSupabaseAdmin() && universeId !== authUserId) {
        res.status(503).json({ success: false, code: 'OWNERSHIP_UNVERIFIABLE', error: 'Vérification de propriété momentanément indisponible. Réessayez.' });
        return null;
      }
      const owns = await userOwnsUniverse(authUserId, universeId);
      if (!owns) {
        res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'Accès refusé : cet univers ne vous appartient pas.' });
        return null;
      }
    }
    return { universeId, userId: authUserId, authUserId, isAdmin };
  };

  // ---------------------------------------------------------------------------
  // 2. INTENTIONS DE PAIEMENT SERVEUR (isolées dans server_security_vault service_role)
  // ---------------------------------------------------------------------------
  const persistIntentRemote = async (intent: PaymentIntent) => {
    const supa = deps.getSupabaseAdmin();
    if (!supa) return;
    try {
      const { error: vaultErr } = await supa.from('server_security_vault').upsert({
        key: `payment_intent_${intent.orderId}`,
        category: 'payment_intents',
        tenant_id: intent.universeId || intent.userId || intent.ownerUserId,
        secret_json: intent,
        updated_at: intent.updatedAt,
      });
      if (!vaultErr) return;
      const { error } = await supa.from('app_registry').upsert({
        key: `payment_intent_${intent.orderId}`,
        name: `Intention paiement ${intent.orderId}`,
        module_key: 'payment_intents',
        is_public: false,
        config_json: intent,
        value: intent,
        updated_at: intent.updatedAt,
      });
      if (error) console.error('[PAYMENT INTENT CLOUD SYNC ERROR]', error.message);
    } catch (err) {
      console.error('[PAYMENT INTENT CLOUD SYNC ERROR]', (err as Error).message);
    }
  };

  const createIntent = async (input: Omit<PaymentIntent, 'orderId' | 'status' | 'createdAt' | 'updatedAt'>): Promise<PaymentIntent> => {
    const prefix = input.purpose === 'SUBSCRIPTION' ? 'SUB' : 'WLT';
    const orderId = `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const nowIso = new Date().toISOString();
    const intent: PaymentIntent = { ...input, orderId, status: 'AWAITING_PAYMENT', attempts: 0, createdAt: nowIso, updatedAt: nowIso };
    const all = readArr(INTENTS_FILE);
    all.unshift(intent);
    writeArr(INTENTS_FILE, all);
    await persistIntentRemote(intent);
    return intent;
  };

  const getIntent = async (orderId: string): Promise<PaymentIntent | null> => {
    const clean = String(orderId || '').trim();
    if (!clean) return null;
    const local = readArr(INTENTS_FILE).find((i: any) => i.orderId === clean);
    if (local) return local;
    const supa = deps.getSupabaseAdmin();
    if (supa) {
      try {
        const { data: vData } = await supa
          .from('server_security_vault')
          .select('secret_json')
          .eq('key', `payment_intent_${clean}`)
          .maybeSingle();
        if (vData?.secret_json?.orderId === clean) {
          const intent = vData.secret_json as PaymentIntent;
          const all = readArr(INTENTS_FILE);
          all.unshift(intent);
          writeArr(INTENTS_FILE, all);
          return intent;
        }
      } catch {}
      try {
        const { data } = await supa.from('app_registry').select('config_json').eq('key', `payment_intent_${clean}`).maybeSingle();
        if (data?.config_json?.orderId === clean) {
          const intent = data.config_json as PaymentIntent;
          const all = readArr(INTENTS_FILE);
          all.unshift(intent);
          writeArr(INTENTS_FILE, all);
          return intent;
        }
      } catch {}
    }
    return null;
  };

  const updateIntent = async (orderId: string, patch: Partial<PaymentIntent>): Promise<PaymentIntent | null> => {
    const all = readArr(INTENTS_FILE);
    const idx = all.findIndex((i: any) => i.orderId === orderId);
    if (idx < 0) return null;
    all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
    writeArr(INTENTS_FILE, all);
    await persistIntentRemote(all[idx]);
    return all[idx];
  };

  const listAwaitingIntents = (maxAgeMs = 48 * 3600 * 1000): PaymentIntent[] => {
    const now = Date.now();
    return readArr(INTENTS_FILE).filter(
      (i: any) => i.status === 'AWAITING_PAYMENT' && now - new Date(i.createdAt).getTime() < maxAgeMs
    );
  };

  // ---------------------------------------------------------------------------
  // 3. VÉRIFICATION SERVEUR DU PAIEMENT
  // ---------------------------------------------------------------------------
  const refMatches = (candidate: any, orderId: string): boolean => {
    const c = String(candidate || '').trim();
    if (!c) return false;
    if (c === orderId) return true;
    return c.endsWith(`___${orderId}`);
  };

  /** Enregistre un paiement confirmé reçu via webhook signé HMAC (source de confiance). */
  const recordSignedWebhookPayment = (payload: any) => {
    const tx = payload?.data || payload || {};
    const status = String(tx.transaction_status || tx.status || payload?.status || '').toUpperCase();
    const record = {
      transactionId: String(tx.transaction_id || tx.transactionId || tx.txId || tx.id || '').trim(),
      externalReference: String(tx.external_reference || tx.externalReference || tx.reference || tx.orderId || '').trim(),
      orderId: String(tx.metadata?.orderId || tx.orderId || '').trim(),
      amount: Number(tx.amount_paid || tx.amountPaid || tx.amount || 0) || 0,
      currency: String(tx.currency || 'XOF').toUpperCase(),
      status,
      receivedAt: new Date().toISOString(),
    };
    if (!record.transactionId && !record.externalReference && !record.orderId) return null;
    const all = readArr(CONFIRMED_FILE);
    all.unshift(record);
    writeArr(CONFIRMED_FILE, all);
    return record;
  };

  const fromSignedWebhooks = (orderId: string): VerifiedPayment | null => {
    const hit = readArr(CONFIRMED_FILE).find(
      (r: any) => refMatches(r.externalReference, orderId) || refMatches(r.orderId, orderId) || refMatches(r.transactionId, orderId)
    );
    if (!hit) return null;
    const isPaid = PAID_STATUSES.includes(hit.status);
    const isFailed = FAILED_STATUSES.includes(hit.status);
    return {
      verified: isPaid,
      status: isPaid ? 'PAID' : isFailed ? 'FAILED' : 'PENDING',
      amount: Number(hit.amount) || 0,
      currency: hit.currency || 'XOF',
      transactionId: hit.transactionId || orderId,
      source: 'signed_webhook',
    };
  };

  const fromRouterLedger = async (orderId: string): Promise<VerifiedPayment | null> => {
    const supa = deps.getSupabaseAdmin();
    if (!supa) return null;
    const rows: any[] = [];
    const queries = [
      () => supa.from('payment_logs').select('*').eq('transaction_id', orderId).limit(5),
      () => supa.from('payment_logs').select('*').like('raw_payload->>external_reference', `%${orderId}`).limit(5),
      () => supa.from('payment_logs').select('*').like('raw_payload->data->>external_reference', `%${orderId}`).limit(5),
    ];
    for (const q of queries) {
      try {
        const { data, error } = await q();
        if (!error && Array.isArray(data)) rows.push(...data);
      } catch {}
    }
    const matching = rows.filter((r) => {
      const p = r.raw_payload || {};
      const d = p.data || p;
      return (
        refMatches(r.transaction_id, orderId) ||
        refMatches(d.external_reference || p.external_reference, orderId) ||
        refMatches(d.externalReference || p.externalReference, orderId)
      );
    });
    const paid = matching.find((r) => PAID_STATUSES.includes(String(r.status || '').toUpperCase()));
    if (paid) {
      const p = paid.raw_payload || {};
      const d = p.data || p;
      return {
        verified: true,
        status: 'PAID',
        amount: Number(paid.amount || d.amount || 0) || 0,
        currency: String(d.currency || p.currency || 'XOF').toUpperCase(),
        transactionId: String(paid.transaction_id || orderId),
        source: 'router_ledger',
      };
    }
    const failed = matching.find((r) => FAILED_STATUSES.includes(String(r.status || '').toUpperCase()));
    if (failed) {
      return { verified: false, status: 'FAILED', amount: 0, currency: 'XOF', transactionId: String(failed.transaction_id || orderId), source: 'router_ledger' };
    }
    return null;
  };

  const getRouterBaseUrl = (): string =>
    String(
      process.env.PAYMENT_API_URL ||
      process.env.VITE_PAYMENT_API_URL ||
      process.env.API_URL ||
      process.env.VITE_API_URL ||
      'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run'
    ).replace(/\/+$/, '');

  const fromRouterApi = async (orderId: string): Promise<VerifiedPayment | null> => {
    const base = getRouterBaseUrl();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      const headers: Record<string, string> = { Accept: 'application/json' };
      const internal = process.env.INTERNAL_API_SECRET || process.env.ADMIN_API_KEY;
      if (internal) headers['x-internal-secret'] = internal;
      const r = await fetch(`${base}/api/payment/sebpay/verify/${encodeURIComponent(orderId)}`, { headers, signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) return null;
      const json: any = await r.json().catch(() => null);
      if (!json) return null;
      const status = String(json.status || json.payment_status || '').toUpperCase();
      const isPaid = (json.isPaid === true || json.success === true) && PAID_STATUSES.includes(status);
      const returnedOrder = String(json.orderId || json.order_id || '');
      if (returnedOrder && returnedOrder !== orderId && !returnedOrder.endsWith(`___${orderId}`)) {
        return { verified: false, status: 'PENDING', amount: 0, currency: 'XOF', transactionId: orderId, source: 'router_api', reason: 'REFERENCE_MISMATCH' };
      }
      return {
        verified: isPaid,
        status: isPaid ? 'PAID' : FAILED_STATUSES.includes(status) ? 'FAILED' : 'PENDING',
        amount: Number(json.amount_paid || json.amountPaid || json.amount || 0) || 0,
        currency: String(json.currency || 'XOF').toUpperCase(),
        transactionId: String(json.transaction_id || json.transactionId || orderId),
        source: 'router_api',
      };
    } catch (err) {
      console.warn('[PAYMENT VERIFY] Routeur injoignable :', (err as Error).message);
      return null;
    }
  };

  /**
   * Vérifie qu'un paiement est réellement encaissé, avec le bon montant et la bonne devise.
   */
  const verifyPayment = async (params: { orderId: string; transactionId?: string; expectedAmount: number; expectedCurrency?: string }): Promise<VerifiedPayment> => {
    const orderId = String(params.orderId || '').trim();
    const txId = String(params.transactionId || '').trim();
    const expectedCurrency = String(params.expectedCurrency || 'XOF').toUpperCase();
    const pending: VerifiedPayment = { verified: false, status: 'PENDING', amount: 0, currency: expectedCurrency, transactionId: txId || orderId, source: 'none' };
    if (!orderId && !txId) return { ...pending, reason: 'REFERENCE_MANQUANTE' };

    const refs = [orderId, txId].filter(Boolean);
    let result: VerifiedPayment | null = null;
    for (const ref of refs) {
      result = fromSignedWebhooks(ref) || result;
      if (result?.verified) break;
      result = (await fromRouterLedger(ref)) || result;
      if (result?.verified) break;
      result = (await fromRouterApi(ref)) || result;
      if (result?.verified) break;
    }
    if (!result) return pending;
    if (!result.verified) return result;

    // Contrôles stricts montant / devise
    if (!(result.amount > 0)) {
      return { ...result, verified: false, status: 'PENDING', reason: 'MONTANT_NON_CONFIRME' };
    }
    const acceptedCurrencies = expectedCurrency === 'XOF' || expectedCurrency === 'FCFA' ? ['XOF', 'FCFA', 'CFA'] : [expectedCurrency];
    if (result.currency && !acceptedCurrencies.includes(result.currency)) {
      return { ...result, verified: false, status: 'FAILED', reason: `DEVISE_INCORRECTE (${result.currency})` };
    }
    if (result.amount + 1 < Number(params.expectedAmount || 0)) {
      return { ...result, verified: false, status: 'FAILED', reason: `MONTANT_INSUFFISANT (${result.amount} < ${params.expectedAmount})` };
    }
    return result;
  };

  /** Verrou en mémoire anti-traitement concurrent d'une même commande. */
  const withLock = async <T>(key: string, fn: () => Promise<T>): Promise<T | { locked: true }> => {
    if (locks.has(key)) return { locked: true };
    locks.add(key);
    try {
      return await fn();
    } finally {
      locks.delete(key);
    }
  };

  return {
    requireAccountOwner,
    createIntent,
    getIntent,
    updateIntent,
    listAwaitingIntents,
    verifyPayment,
    recordSignedWebhookPayment,
    withLock,
  };
}
