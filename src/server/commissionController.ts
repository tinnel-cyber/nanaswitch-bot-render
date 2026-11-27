/**
 * @file commissionController.ts
 * @description Gestion stricte du Plan Commission via sa table dédiée Supabase (`commission_accounts` & `commission_transactions`).
 * Sépare formellement : Abonnements (`subscriptions`) vs Pay-As-You-Go (`payg_entitlements`) vs Commission (`commission_accounts`).
 */

import type { Express, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://wsxnznobeefrsoicjqte.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  '';

const supabaseAdmin = supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const DEFAULT_COMMISSION_RATE_PERCENT = 10;

export function attachCommissionRoutes(app: Express): void {
  // 1. GET /api/merchant/commission/status — Vérifie si le marchand est dans la table commission_accounts
  app.get('/api/merchant/commission/status', async (req: Request, res: Response) => {
    const userId = String(req.query.userId || '').trim();
    const universeId = String(req.query.universeId || '').trim();
    if (!userId && !universeId) {
      return res.status(400).json({ success: false, error: 'userId ou universeId requis.' });
    }
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Supabase non configuré côté serveur.' });
    }

    const filters: string[] = [];
    if (userId) filters.push(`user_id.eq.${userId}`);
    if (universeId) filters.push(`universe_id.eq.${universeId}`);

    const { data: account, error } = await supabaseAdmin
      .from('commission_accounts')
      .select('*')
      .or(filters.join(','))
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      isCommissionPlan: Boolean(account && account.status === 'ACTIVE'),
      account: account || null,
    });
  });

  // 2. POST /api/merchant/commission/enroll — Inscrit officiellement un marchand dans commission_accounts
  app.post('/api/merchant/commission/enroll', async (req: Request, res: Response) => {
    try {
      if (!supabaseAdmin) {
        return res.status(503).json({ success: false, error: 'Supabase non configuré côté serveur.' });
      }
      const authHeader = String(req.headers.authorization || '');
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentification requise.' });
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
      } = req.body || {};

      const userId = authData.user.id;
      const cleanUniverseId = String(universeId || userId).trim();
      const accountId = cleanUniverseId || userId;
      const rate = Math.max(1, Math.min(30, Number(commissionRatePercent) || DEFAULT_COMMISSION_RATE_PERCENT));

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
            updated_at: new Date().toISOString(),
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
        .update({ pricing_model: 'commission', updated_at: new Date().toISOString() })
        .eq('id', userId);

      return res.json({
        success: true,
        account: upserted,
        message: `Compte enregistré sous Plan Commission (${rate}% par vente).`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Erreur inscription Plan Commission.' });
    }
  });

  // 3. POST /api/merchant/commission/record-sale — Enregistre une vente et sa commission dans commission_transactions
  app.post('/api/merchant/commission/record-sale', async (req: Request, res: Response) => {
    try {
      if (!supabaseAdmin) {
        return res.status(503).json({ success: false, error: 'Supabase non configuré côté serveur.' });
      }
      const { universeId = '', orderRef = '', grossAmountXof = 0, channel = 'DIGITAL_SALE' } = req.body || {};
      const cleanUniverseId = String(universeId || '').trim();
      const gross = Math.round(Number(grossAmountXof) || 0);
      if (!cleanUniverseId || !orderRef || gross <= 0) {
        return res.status(400).json({ success: false, error: 'universeId, orderRef et grossAmountXof (> 0) requis.' });
      }

      const { data: account } = await supabaseAdmin
        .from('commission_accounts')
        .select('*')
        .eq('universe_id', cleanUniverseId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (!account) {
        return res.json({
          success: true,
          applied: false,
          reason: 'MARCHAND_NON_COMMISSION',
        });
      }

      const rate = Number(account.commission_rate_percent || DEFAULT_COMMISSION_RATE_PERCENT);
      const commissionAmount = Math.round((gross * rate) / 100);
      const netMerchant = Math.max(0, gross - commissionAmount);
      const txId = `COM-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      const { error: txErr } = await supabaseAdmin.from('commission_transactions').insert({
        id: txId,
        commission_account_id: account.id,
        universe_id: cleanUniverseId,
        order_ref: String(orderRef),
        gross_amount_xof: gross,
        commission_rate_percent: rate,
        commission_amount_xof: commissionAmount,
        net_merchant_xof: netMerchant,
        channel: String(channel),
      });

      if (txErr) {
        return res.status(500).json({ success: false, error: txErr.message });
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

      return res.json({
        success: true,
        applied: true,
        commissionRatePercent: rate,
        commissionAmountXof: commissionAmount,
        netMerchantXof: netMerchant,
        txId,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Erreur calcul commission.' });
    }
  });
}
