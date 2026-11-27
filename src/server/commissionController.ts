/**
 * @file commissionController.ts
 * @description Gestion stricte du Plan Commission via sa table dédiée Supabase (`commission_accounts` & `commission_transactions`).
 * Sépare formellement : Abonnements (`subscriptions`) vs Pay-As-You-Go (`payg_entitlements`) vs Commission (`commission_accounts`).
 */

import type { Express, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

let cachedCommissionSupabase: any = null;

function getCommissionSupabase() {
  if (cachedCommissionSupabase) return cachedCommissionSupabase;
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://wsxnznobeefrsoicjqte.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    '';
  if (!key) return null;
  cachedCommissionSupabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedCommissionSupabase;
}

const DEFAULT_COMMISSION_RATE_PERCENT = 14;

export async function recordCommissionSaleInternal(params: {
  universeId: string;
  orderRef: string;
  grossAmountXof: number;
  channel?: string;
}): Promise<{
  applied: boolean;
  reason?: string;
  commissionRatePercent?: number;
  commissionAmountXof?: number;
  netMerchantXof?: number;
  txId?: string;
}> {
  const supabaseAdmin = getCommissionSupabase();
  if (!supabaseAdmin) {
    throw new Error('Supabase non configuré côté serveur.');
  }
  const cleanUniverseId = String(params.universeId || '').trim().replace(/[^a-zA-Z0-9_.:-]/g, '');
  const gross = Math.round(Number(params.grossAmountXof) || 0);
  if (!cleanUniverseId || !params.orderRef || gross <= 0) {
    throw new Error('universeId, orderRef et grossAmountXof (> 0) requis.');
  }

  const { data: account } = await supabaseAdmin
    .from('commission_accounts')
    .select('*')
    .or(`universe_id.eq.${cleanUniverseId},user_id.eq.${cleanUniverseId},id.eq.${cleanUniverseId}`)
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle();

  if (!account) {
    return { applied: false, reason: 'MARCHAND_NON_COMMISSION' };
  }

  // Idempotence sur order_ref pour éviter tout double prélèvement
  const { data: existingTx } = await supabaseAdmin
    .from('commission_transactions')
    .select('id, commission_rate_percent, commission_amount_xof, net_merchant_xof')
    .eq('commission_account_id', account.id)
    .eq('order_ref', String(params.orderRef))
    .limit(1)
    .maybeSingle();

  if (existingTx) {
    return {
      applied: true,
      commissionRatePercent: Number(existingTx.commission_rate_percent),
      commissionAmountXof: Number(existingTx.commission_amount_xof),
      netMerchantXof: Number(existingTx.net_merchant_xof),
      txId: existingTx.id,
    };
  }

  const rate = Number(account.commission_rate_percent || DEFAULT_COMMISSION_RATE_PERCENT);
  const commissionAmount = Math.round((gross * rate) / 100);
  const netMerchant = Math.max(0, gross - commissionAmount);
  const txId = `COM-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  const { error: txErr } = await supabaseAdmin.from('commission_transactions').insert({
    id: txId,
    commission_account_id: account.id,
    universe_id: account.universe_id,
    order_ref: String(params.orderRef),
    gross_amount_xof: gross,
    commission_rate_percent: rate,
    commission_amount_xof: commissionAmount,
    net_merchant_xof: netMerchant,
    channel: String(params.channel || 'DIGITAL_SALE'),
  });

  if (txErr) {
    throw new Error(txErr.message);
  }

  await supabaseAdmin
    .from('commission_accounts')
    .update({
      total_sales_xof: Number(account.total_sales_xof || 0) + gross,
      total_commission_xof: Number(account.total_commission_xof || 0) + commissionAmount,
      total_net_merchant_xof: Number(account.total_net_merchant_xof || 0) + netMerchant,
      transactions_count: Number(account.transactions_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id);

  return {
    applied: true,
    commissionRatePercent: rate,
    commissionAmountXof: commissionAmount,
    netMerchantXof: netMerchant,
    txId,
  };
}

const KNOWN_COMMISSION_ADMIN_EMAILS = new Set([
  'pousbila04@gmail.com',
  'pousbila36@gmail.com',
  'contact@nanasore.com',
  ...(process.env.SUPER_ADMIN_EMAILS
    ? process.env.SUPER_ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    : []),
]);

function isInternalAdminHeader(req: Request): boolean {
  const internalSecret = String(process.env.ADMIN_API_KEY || process.env.INTERNAL_API_SECRET || '').trim();
  const providedKey = String(req.headers['x-admin-api-key'] || req.headers['x-internal-secret'] || '').trim();
  if (!internalSecret || !providedKey) return false;
  const bufA = Buffer.from(providedKey, 'utf8');
  const bufB = Buffer.from(internalSecret, 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

async function resolveCommissionCaller(req: Request): Promise<{ user: any | null; isSuperAdmin: boolean; isInternal: boolean }> {
  if (isInternalAdminHeader(req)) {
    return { user: null, isSuperAdmin: true, isInternal: true };
  }
  const supabaseAdmin = getCommissionSupabase();
  if (!supabaseAdmin) return { user: null, isSuperAdmin: false, isInternal: false };
  const authHeader = String(req.headers.authorization || '');
  if (!authHeader.startsWith('Bearer ')) return { user: null, isSuperAdmin: false, isInternal: false };
  const token = authHeader.slice(7).trim();
  if (!token) return { user: null, isSuperAdmin: false, isInternal: false };
  const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !authData?.user) return { user: null, isSuperAdmin: false, isInternal: false };

  const user = authData.user;
  const email = String(user.email || '').toLowerCase();
  // SÉCURITÉ : Ne jamais lire user_metadata.role (modifiable par le client) — uniquement app_metadata ou table super_admins
  const appRole = String(user.app_metadata?.role || '').toUpperCase();
  if (KNOWN_COMMISSION_ADMIN_EMAILS.has(email) || appRole === 'SUPER_ADMIN' || appRole === 'ADMIN') {
    return { user, isSuperAdmin: true, isInternal: false };
  }
  try {
    const { data: sa } = await supabaseAdmin
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (sa?.user_id) {
      return { user, isSuperAdmin: true, isInternal: false };
    }
  } catch {}
  return { user, isSuperAdmin: false, isInternal: false };
}

export function attachCommissionRoutes(app: Express): void {
  // 1. GET /api/merchant/commission/status — Vérifie si le marchand est dans commission_accounts + retourne ses transactions
  app.get('/api/merchant/commission/status', async (req: Request, res: Response) => {
    const cleanId = (v: any) => String(v || '').trim().replace(/[^a-zA-Z0-9_.:-]/g, '');
    const userId = cleanId(req.query.userId);
    const universeId = cleanId(req.query.universeId);
    if (!userId && !universeId) {
      return res.status(400).json({ success: false, error: 'userId ou universeId requis.' });
    }
    const caller = await resolveCommissionCaller(req);
    if (!caller.isInternal && !caller.user) {
      return res.status(401).json({ success: false, error: 'Authentification requise.' });
    }
    const supabaseAdmin = getCommissionSupabase();
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Supabase non configuré côté serveur.' });
    }
    if (!caller.isSuperAdmin && userId && caller.user && userId !== caller.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé à ce compte commission.' });
    }

    let account: any = null;
    if (universeId) {
      const { data, error } = await supabaseAdmin
        .from('commission_accounts')
        .select('*')
        .eq('universe_id', universeId)
        .limit(1)
        .maybeSingle();
      if (error) return res.status(500).json({ success: false, error: error.message });
      account = data;
    }
    if (!account && userId) {
      const { data, error } = await supabaseAdmin
        .from('commission_accounts')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      if (error) return res.status(500).json({ success: false, error: error.message });
      account = data;
    }

    if (account && !caller.isSuperAdmin && caller.user && String(account.user_id || '') !== caller.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé : ce contrat commission appartient à un autre compte.' });
    }

    let transactions: any[] = [];
    if (account?.id) {
      const { data: txRows } = await supabaseAdmin
        .from('commission_transactions')
        .select('*')
        .eq('commission_account_id', account.id)
        .order('created_at', { ascending: false })
        .limit(100);
      transactions = txRows || [];
    }

    return res.json({
      success: true,
      isCommissionPlan: Boolean(account && account.status === 'ACTIVE'),
      account: account || null,
      transactions,
    });
  });

  // 2. POST /api/merchant/commission/enroll — Inscrit officiellement un marchand avec contrat signé + copie Super Admin
  app.post('/api/merchant/commission/enroll', async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = getCommissionSupabase();
      const authHeader = String(req.headers.authorization || '');
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentification requise.' });
      }
      if (!supabaseAdmin) {
        return res.status(503).json({ success: false, error: 'Supabase non configuré côté serveur.' });
      }
      const token = authHeader.slice(7).trim();
      const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (authErr || !authData?.user) {
        return res.status(401).json({ success: false, error: 'Session expirée ou invalide.' });
      }

      const {
        universeId = '',
        storeName = '',
        commissionRatePercent = DEFAULT_COMMISSION_RATE_PERCENT,
        fullName = '',
        businessDomain = '',
        paymentNumber1 = '',
        paymentNumber2 = '',
        emergencyContactName = '',
        emergencyContactPhone = '',
        signatureDataUrl = '',
        contractAccepted = false,
        contractNumber = '',
        contractHtml = '',
      } = req.body || {};

      if (!String(fullName).trim() || !String(businessDomain).trim() || !String(paymentNumber1).trim() || !String(paymentNumber2).trim() || !String(emergencyContactName).trim() || !String(emergencyContactPhone).trim()) {
        return res.status(400).json({
          success: false,
          error: 'Tous les champs du formulaire (nom complet, domaine, 2 numéros de paiement, contact d\'urgence) sont obligatoires.',
        });
      }

      if (!signatureDataUrl || !contractAccepted) {
        return res.status(400).json({
          success: false,
          error: 'La signature manuscrite et l\'acceptation du contrat ("Lu et approuvé") sont requises.',
        });
      }

      const userId = authData.user.id;
      const cleanUniverseId = String(universeId || userId).trim();
      const accountId = cleanUniverseId || userId;
      const rate = Math.max(1, Math.min(30, Number(commissionRatePercent) || DEFAULT_COMMISSION_RATE_PERCENT));
      const nowIso = new Date().toISOString();
      const finalContractNumber = String(contractNumber || `CTR-COM-${Date.now().toString(36).toUpperCase()}`).trim();

      // Vérifier qu'on n'écrase pas le contrat existant d'un autre utilisateur
      const { data: existingAcc } = await supabaseAdmin
        .from('commission_accounts')
        .select('user_id')
        .eq('id', accountId)
        .maybeSingle();
      if (existingAcc?.user_id && String(existingAcc.user_id) !== userId) {
        return res.status(403).json({ success: false, error: 'Cet univers appartient à un autre compte marchand.' });
      }

      const { data: upserted, error } = await supabaseAdmin
        .from('commission_accounts')
        .upsert(
          {
            id: accountId,
            user_id: userId,
            universe_id: cleanUniverseId,
            email: authData.user.email || null,
            store_name: String(storeName || '').trim() || null,
            status: 'ACTIVE',
            commission_rate_percent: rate,
            full_name: String(fullName).trim(),
            business_domain: String(businessDomain).trim(),
            payment_number_1: String(paymentNumber1).trim(),
            payment_number_2: String(paymentNumber2).trim(),
            emergency_contact_name: String(emergencyContactName).trim(),
            emergency_contact_phone: String(emergencyContactPhone).trim(),
            signature_data_url: String(signatureDataUrl),
            contract_accepted: Boolean(contractAccepted),
            contract_number: finalContractNumber,
            contract_signed_at: nowIso,
            contract_html: String(contractHtml || ''),
            admin_notified: true,
            admin_reviewed: false,
            updated_at: nowIso,
          },
          { onConflict: 'id' }
        )
        .select('*')
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      await supabaseAdmin
        .from('profiles')
        .update({ pricing_model: 'commission', updated_at: nowIso })
        .eq('id', userId);

      // Notification directe vers le Super Admin Dashboard (best-effort dans saas_action_tasks)
      try {
        await supabaseAdmin.from('saas_action_tasks').insert({
          id: `TASK-COM-${Date.now().toString(36).toUpperCase()}`,
          title: `Nouveau contrat Plan Commission signé (${finalContractNumber})`,
          description: `${String(fullName).trim()} (${String(businessDomain).trim()}) a signé le contrat Plan Commission ${rate}%. Paiements : ${String(paymentNumber1).trim()} / ${String(paymentNumber2).trim()}. Contact urgence : ${String(emergencyContactName).trim()} (${String(emergencyContactPhone).trim()}).`,
          priority: 'HIGH',
          status: 'PENDING',
          store_id: cleanUniverseId,
          created_at: nowIso,
        });
      } catch {
        // Table optionnelle selon l'environnement
      }

      return res.json({
        success: true,
        account: upserted,
        contractNumber: finalContractNumber,
        message: `Contrat ${finalContractNumber} validé, enregistré dans Supabase et transmis au Super Admin (${rate}% par vente).`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Erreur inscription Plan Commission.' });
    }
  });

  // 3. POST /api/merchant/commission/record-sale — Enregistre une vente et sa commission (interne ou authentifié uniquement)
  app.post('/api/merchant/commission/record-sale', async (req: Request, res: Response) => {
    try {
      const caller = await resolveCommissionCaller(req);
      if (!caller.isInternal && !caller.user) {
        return res.status(401).json({ success: false, error: 'Authentification requise.' });
      }
      const { universeId = '', orderRef = '', grossAmountXof = 0, channel = 'DIGITAL_SALE' } = req.body || {};
      const result = await recordCommissionSaleInternal({
        universeId,
        orderRef,
        grossAmountXof,
        channel,
      });
      return res.json({ success: true, ...result });
    } catch (err: any) {
      const msg = err?.message || 'Erreur calcul commission.';
      const status = msg.includes('requis') ? 400 : msg.includes('non configuré') ? 503 : 500;
      return res.status(status).json({ success: false, error: msg });
    }
  });

  // 4. GET /api/admin/commission/accounts — Liste tous les comptes & contrats commission pour le Super Admin Dashboard
  app.get('/api/admin/commission/accounts', async (req: Request, res: Response) => {
    try {
      const caller = await resolveCommissionCaller(req);
      if (!caller.isInternal && !caller.user) {
        return res.status(401).json({ success: false, error: 'Authentification Super Admin requise.' });
      }
      if (!caller.isSuperAdmin) {
        return res.status(403).json({ success: false, error: 'Accès refusé : privilèges Super-Administrateur requis.' });
      }
      const supabaseAdmin = getCommissionSupabase();
      if (!supabaseAdmin) {
        return res.status(503).json({ success: false, error: 'Supabase non configuré côté serveur.' });
      }

      const { data: accounts, error } = await supabaseAdmin
        .from('commission_accounts')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200);

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      const { data: recentTx } = await supabaseAdmin
        .from('commission_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      const list = accounts || [];
      const summary = {
        totalAccounts: list.length,
        activeAccounts: list.filter((a: any) => a.status === 'ACTIVE').length,
        pendingReviewCount: list.filter((a: any) => a.contract_accepted && !a.admin_reviewed).length,
        totalSalesXof: list.reduce((acc: number, a: any) => acc + Number(a.total_sales_xof || 0), 0),
        totalCommissionXof: list.reduce((acc: number, a: any) => acc + Number(a.total_commission_xof || 0), 0),
        totalNetMerchantXof: list.reduce((acc: number, a: any) => acc + Number(a.total_net_merchant_xof || 0), 0),
      };

      return res.json({
        success: true,
        accounts: list,
        transactions: recentTx || [],
        summary,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Erreur chargement contrats commission.' });
    }
  });

  // 5. PATCH /api/admin/commission/accounts/:id/review — Validation / changement de statut par le Super Admin
  app.patch('/api/admin/commission/accounts/:id/review', async (req: Request, res: Response) => {
    try {
      const caller = await resolveCommissionCaller(req);
      if (!caller.isInternal && !caller.user) {
        return res.status(401).json({ success: false, error: 'Authentification Super Admin requise.' });
      }
      if (!caller.isSuperAdmin) {
        return res.status(403).json({ success: false, error: 'Accès refusé : privilèges Super-Administrateur requis.' });
      }
      const supabaseAdmin = getCommissionSupabase();
      if (!supabaseAdmin) {
        return res.status(503).json({ success: false, error: 'Supabase non configuré côté serveur.' });
      }

      const accountId = String(req.params.id || '').trim();
      const { adminReviewed, status } = req.body || {};
      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (typeof adminReviewed === 'boolean') updatePayload.admin_reviewed = adminReviewed;
      if (status && ['ACTIVE', 'SUSPENDED', 'SWITCHED_TO_SUBSCRIPTION', 'SWITCHED_TO_PAYG'].includes(String(status))) {
        updatePayload.status = String(status);
      }

      const { data: updated, error } = await supabaseAdmin
        .from('commission_accounts')
        .update(updatePayload)
        .eq('id', accountId)
        .select('*')
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.json({ success: true, account: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Erreur mise à jour compte commission.' });
    }
  });
}
