-- ==============================================================================
-- URGENCE PRODUCTION SECURITY LOCKDOWN (Audit P0 #1 / #2 / #3 — 100% Schema-Safe)
-- 0. Fonctions RLS tolérantes aux schémas v1/v2 (`nana_rls_is_super_admin`, `nana_rls_owns_tenant`)
--    => Aucun échec 42703 / 42P01 même si `universes`, `merchants`, `wallet_transactions`
--       ou `app_registry` utilisent un schéma antérieur sans `user_id` ou `tenant_id`.
-- 1. Coffre-fort serveur `public.server_security_vault` (100% service_role, zéro accès anon/authenticated)
--    + Migration & purge hors de `public.app_registry` des secrets Webhook, Hash PIN, Payment Intents & Crédits PAYG.
-- 2. Durcissement RLS de `public.app_registry` (interdiction stricte des préfixes sensibles & isolation tenant).
-- 3. Verrouillage total de `public.bf_sms_payments` (fin de l'écoute anonyme des SMS clients BF + RPC atomique `consume_bf_sms_payment_for_sale`).
-- 4. Correction des régressions RLS de `20261122020000` (`wallet_transactions`, `merchant_subscriptions`, `merchant_disputes`, `support_tickets`).
-- 5. Isolation stricte par propriétaire sur `public.funnels` (anti-Stored XSS inter-boutiques).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. FONCTIONS D'AUTORISATION RLS TOLÉRANTES AUX VARIANTES DE SCHÉMA
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nana_rls_is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT;
  v_claims JSONB;
  v_app_role TEXT;
  v_match BOOLEAN := FALSE;
BEGIN
  v_uid := COALESCE(auth.uid()::text, '');
  IF v_uid = '' THEN
    RETURN FALSE;
  END IF;

  BEGIN
    v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
    v_app_role := UPPER(COALESCE(v_claims->'app_metadata'->>'role', ''));
    IF v_app_role IN ('SUPER_ADMIN', 'ADMIN') THEN
      RETURN TRUE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF to_regclass('public.super_admins') IS NOT NULL THEN
    EXECUTE $q$
      SELECT EXISTS (
        SELECT 1
        FROM public.super_admins sa
        WHERE COALESCE(
          to_jsonb(sa)->>'user_id',
          to_jsonb(sa)->>'id',
          to_jsonb(sa)->>'owner_id',
          ''
        ) = $1
      )
    $q$ INTO v_match USING v_uid;

    IF v_match THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.nana_rls_owns_tenant(p_tenant_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT;
  v_tenant TEXT;
  v_match BOOLEAN := FALSE;
BEGIN
  v_uid := COALESCE(auth.uid()::text, '');
  IF v_uid = '' THEN
    RETURN FALSE;
  END IF;

  IF public.nana_rls_is_super_admin() THEN
    RETURN TRUE;
  END IF;

  v_tenant := BTRIM(COALESCE(p_tenant_id, ''));
  IF v_tenant = '' THEN
    RETURN FALSE;
  END IF;

  IF v_tenant = v_uid THEN
    RETURN TRUE;
  END IF;

  -- Vérification tolérante sur public.universes (user_id, owner_id, owner_uid, uid ou settings JSON)
  IF to_regclass('public.universes') IS NOT NULL THEN
    EXECUTE $q$
      SELECT EXISTS (
        SELECT 1
        FROM public.universes u
        WHERE (to_jsonb(u)->>'id') = $1
          AND (
            COALESCE(
              to_jsonb(u)->>'user_id',
              to_jsonb(u)->>'owner_id',
              to_jsonb(u)->>'owner_uid',
              to_jsonb(u)->>'uid',
              to_jsonb(u)->>'merchant_id',
              ''
            ) = $2
            OR COALESCE(
              to_jsonb(u)->'settings'->>'owner_id',
              to_jsonb(u)->'settings'->>'user_id',
              ''
            ) = $2
          )
      )
    $q$ INTO v_match USING v_tenant, v_uid;

    IF v_match THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Vérification tolérante sur public.merchants
  IF to_regclass('public.merchants') IS NOT NULL THEN
    EXECUTE $q$
      SELECT EXISTS (
        SELECT 1
        FROM public.merchants m
        WHERE (to_jsonb(m)->>'id') = $1
          AND COALESCE(
            to_jsonb(m)->>'owner_id',
            to_jsonb(m)->>'user_id',
            to_jsonb(m)->>'owner_uid',
            to_jsonb(m)->>'uid',
            ''
          ) = $2
      )
    $q$ INTO v_match USING v_tenant, v_uid;

    IF v_match THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Vérification tolérante sur public.tenants
  IF to_regclass('public.tenants') IS NOT NULL THEN
    EXECUTE $q$
      SELECT EXISTS (
        SELECT 1
        FROM public.tenants t
        WHERE (to_jsonb(t)->>'id') = $1
          AND COALESCE(
            to_jsonb(t)->>'owner_id',
            to_jsonb(t)->>'user_id',
            ''
          ) = $2
      )
    $q$ INTO v_match USING v_tenant, v_uid;

    IF v_match THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Vérification tolérante sur public.organizations
  IF to_regclass('public.organizations') IS NOT NULL THEN
    EXECUTE $q$
      SELECT EXISTS (
        SELECT 1
        FROM public.organizations o
        WHERE (to_jsonb(o)->>'id') = $1
          AND COALESCE(
            to_jsonb(o)->>'owner_id',
            to_jsonb(o)->>'user_id',
            to_jsonb(o)->>'created_by',
            ''
          ) = $2
      )
    $q$ INTO v_match USING v_tenant, v_uid;

    IF v_match THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Vérification tolérante sur public.wallets (pour wallet_transactions reliées via wallet_id)
  IF to_regclass('public.wallets') IS NOT NULL THEN
    EXECUTE $q$
      SELECT EXISTS (
        SELECT 1
        FROM public.wallets w
        WHERE (to_jsonb(w)->>'id') = $1
          AND COALESCE(
            to_jsonb(w)->>'user_id',
            to_jsonb(w)->>'owner_id',
            to_jsonb(w)->>'tenant_id',
            ''
          ) = $2
      )
    $q$ INTO v_match USING v_tenant, v_uid;

    IF v_match THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.nana_rls_is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nana_rls_is_super_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.nana_rls_owns_tenant(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nana_rls_owns_tenant(TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 1. COFFRE-FORT SERVEUR STRICTEMENT SERVICE_ROLE (`public.server_security_vault`)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.server_security_vault (
  key TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'general',
  tenant_id TEXT,
  secret_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_server_security_vault_category_tenant
  ON public.server_security_vault (category, tenant_id);

ALTER TABLE public.server_security_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_security_vault FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.server_security_vault FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.server_security_vault TO service_role;

DROP POLICY IF EXISTS server_security_vault_service_only ON public.server_security_vault;
CREATE POLICY server_security_vault_service_only
  ON public.server_security_vault
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Migration automatique des secrets existants hors de public.app_registry puis suppression de app_registry
DO $$
BEGIN
  IF to_regclass('public.app_registry') IS NOT NULL THEN
    INSERT INTO public.server_security_vault (key, category, tenant_id, secret_json, updated_at)
    SELECT
      to_jsonb(r)->>'key',
      CASE
        WHEN (to_jsonb(r)->>'key') LIKE 'webhook_import_secrets_%' THEN 'webhook_secrets'
        WHEN (to_jsonb(r)->>'key') LIKE 'wallet_pin_%' THEN 'wallet_pin'
        WHEN (to_jsonb(r)->>'key') LIKE 'payment_intent_%' THEN 'payment_intents'
        WHEN (to_jsonb(r)->>'key') LIKE 'payg_module_%' THEN 'payg_entitlements'
        ELSE 'system_secret'
      END,
      NULLIF(COALESCE(to_jsonb(r)->>'tenant_id', to_jsonb(r)->>'organization_id', ''), ''),
      COALESCE(
        jsonb_strip_nulls(to_jsonb(r))->'config_json',
        jsonb_strip_nulls(to_jsonb(r))->'settings',
        jsonb_strip_nulls(to_jsonb(r))->'value',
        '{}'::jsonb
      ),
      COALESCE(NULLIF(to_jsonb(r)->>'updated_at', '')::timestamptz, NOW())
    FROM public.app_registry r
    WHERE (to_jsonb(r)->>'key') LIKE 'webhook_import_secrets_%'
       OR (to_jsonb(r)->>'key') LIKE 'wallet_pin_%'
       OR (to_jsonb(r)->>'key') LIKE 'payment_intent_%'
       OR (to_jsonb(r)->>'key') LIKE 'payg_module_%'
    ON CONFLICT (key) DO UPDATE
      SET secret_json = EXCLUDED.secret_json,
          tenant_id = COALESCE(EXCLUDED.tenant_id, public.server_security_vault.tenant_id),
          updated_at = EXCLUDED.updated_at;

    DELETE FROM public.app_registry r
    WHERE (to_jsonb(r)->>'key') LIKE 'webhook_import_secrets_%'
       OR (to_jsonb(r)->>'key') LIKE 'wallet_pin_%'
       OR (to_jsonb(r)->>'key') LIKE 'payment_intent_%'
       OR (to_jsonb(r)->>'key') LIKE 'payg_module_%';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. DURCISSEMENT DE `public.app_registry` (ZÉRO SECRET, ISOLATION TENANT)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_has_is_public BOOLEAN;
  v_has_tenant_id BOOLEAN;
  v_public_cond TEXT := 'true';
  v_write_owner_cond TEXT := 'public.nana_rls_is_super_admin()';
  v_secret_guard TEXT := $guard$
    key NOT LIKE 'webhook_import_secrets_%'
    AND key NOT LIKE 'wallet_pin_%'
    AND key NOT LIKE 'payment_intent_%'
    AND key NOT LIKE 'payg_module_%'
  $guard$;
BEGIN
  IF to_regclass('public.app_registry') IS NOT NULL THEN
    ALTER TABLE public.app_registry ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "app_registry_public_read" ON public.app_registry;
    DROP POLICY IF EXISTS "app_registry_read_policy" ON public.app_registry;
    DROP POLICY IF EXISTS "app_registry_authenticated_upsert" ON public.app_registry;
    DROP POLICY IF EXISTS "app_registry_service_role_all" ON public.app_registry;
    DROP POLICY IF EXISTS "app_registry_safe_public_select" ON public.app_registry;
    DROP POLICY IF EXISTS "app_registry_tenant_owner_write" ON public.app_registry;

    CREATE POLICY "app_registry_service_role_all"
      ON public.app_registry
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'app_registry' AND column_name = 'is_public'
    ) INTO v_has_is_public;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'app_registry' AND column_name = 'tenant_id'
    ) INTO v_has_tenant_id;

    IF v_has_is_public THEN
      v_public_cond := 'COALESCE(is_public, true) = true';
    END IF;

    IF v_has_tenant_id THEN
      v_write_owner_cond := 'tenant_id IS NULL OR tenant_id::text = '''' OR public.nana_rls_owns_tenant(tenant_id::text)';
    ELSE
      v_write_owner_cond := 'auth.uid() IS NOT NULL';
    END IF;

    EXECUTE format(
      'CREATE POLICY "app_registry_safe_public_select" ON public.app_registry FOR SELECT TO anon, authenticated USING ((%s) AND (%s))',
      v_public_cond,
      v_secret_guard
    );

    EXECUTE format(
      'CREATE POLICY "app_registry_tenant_owner_write" ON public.app_registry FOR ALL TO authenticated USING (auth.uid() IS NOT NULL AND (%s) AND (%s)) WITH CHECK (auth.uid() IS NOT NULL AND (%s) AND (%s))',
      v_secret_guard,
      v_write_owner_cond,
      v_secret_guard,
      v_write_owner_cond
    );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. VERROUILLAGE TOTAL DES SMS DE PAIEMENT BURKINA FASO (`public.bf_sms_payments`)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bf_sms_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL,
  operator TEXT NOT NULL DEFAULT 'ORANGE_MONEY',
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'XOF',
  sender_phone TEXT DEFAULT NULL,
  merchant_code TEXT DEFAULT NULL,
  raw_sms TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'unmatched',
  matched_order_id TEXT DEFAULT NULL,
  matched_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF to_regclass('public.bf_sms_payments') IS NOT NULL THEN
    ALTER TABLE public.bf_sms_payments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.bf_sms_payments FORCE ROW LEVEL SECURITY;

    -- Supprimer la lecture publique qui exposait tous les IDs de transaction SMS en direct
    DROP POLICY IF EXISTS "bf_sms_payments_realtime_select" ON public.bf_sms_payments;
    DROP POLICY IF EXISTS "bf_sms_payments_service_insert" ON public.bf_sms_payments;

    CREATE POLICY "bf_sms_payments_service_insert"
      ON public.bf_sms_payments
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    -- Retirer la table de la diffusion publique Supabase Realtime (si la publication existe)
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND EXISTS (
         SELECT 1
         FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime'
           AND schemaname = 'public'
           AND tablename = 'bf_sms_payments'
       ) THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.bf_sms_payments;
    END IF;

    REVOKE ALL ON public.bf_sms_payments FROM PUBLIC, anon, authenticated;
    GRANT ALL ON public.bf_sms_payments TO service_role;
  END IF;
END $$;

-- RPC serveur atomique (service_role uniquement) pour consommer définitivement un SMS BF lors du crédit Wallet
CREATE OR REPLACE FUNCTION public.consume_bf_sms_payment_for_sale(
  p_order_id TEXT,
  p_transaction_id TEXT DEFAULT NULL,
  p_expected_amount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_order TEXT := BTRIM(COALESCE(p_order_id, ''));
  v_clean_tx TEXT := UPPER(BTRIM(COALESCE(p_transaction_id, '')));
  v_sms_row RECORD;
BEGIN
  IF v_clean_order = '' THEN
    RETURN jsonb_build_object('verified', false, 'reason', 'MISSING_ORDER_ID');
  END IF;

  IF to_regclass('public.bf_sms_payments') IS NULL THEN
    RETURN jsonb_build_object('verified', false, 'reason', 'TABLE_NOT_FOUND');
  END IF;

  IF v_clean_tx <> '' THEN
    SELECT *
    INTO v_sms_row
    FROM public.bf_sms_payments
    WHERE UPPER(BTRIM(transaction_id)) = v_clean_tx
    FOR UPDATE;
  ELSE
    SELECT *
    INTO v_sms_row
    FROM public.bf_sms_payments
    WHERE matched_order_id = v_clean_order
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('verified', false, 'reason', 'SMS_NOT_FOUND');
  END IF;

  IF UPPER(COALESCE(v_sms_row.status, '')) IN ('FAILED', 'REJECTED', 'CANCELLED', 'CANCELED') THEN
    RETURN jsonb_build_object('verified', false, 'reason', 'SMS_REJECTED');
  END IF;

  -- Interdiction stricte de réutiliser un SMS déjà lié ou consommé par une AUTRE commande !
  IF COALESCE(BTRIM(v_sms_row.matched_order_id), '') <> ''
     AND v_sms_row.matched_order_id <> v_clean_order THEN
    RETURN jsonb_build_object('verified', false, 'reason', 'TRANSACTION_ALREADY_CONSUMED_BY_OTHER_ORDER');
  END IF;

  IF v_sms_row.status = 'consumed' AND COALESCE(v_sms_row.matched_order_id, '') <> v_clean_order THEN
    RETURN jsonb_build_object('verified', false, 'reason', 'TRANSACTION_ALREADY_CONSUMED');
  END IF;

  IF p_expected_amount IS NOT NULL AND p_expected_amount > 0 AND ROUND(v_sms_row.amount) < ROUND(p_expected_amount) THEN
    RETURN jsonb_build_object(
      'verified', false,
      'reason', 'AMOUNT_MISMATCH',
      'received_amount', v_sms_row.amount,
      'expected_amount', p_expected_amount
    );
  END IF;

  UPDATE public.bf_sms_payments
  SET status = 'consumed',
      matched_order_id = v_clean_order,
      matched_at = COALESCE(matched_at, NOW())
  WHERE id = v_sms_row.id;

  RETURN jsonb_build_object(
    'verified', true,
    'id', v_sms_row.id,
    'transaction_id', v_sms_row.transaction_id,
    'amount', ROUND(v_sms_row.amount),
    'operator', v_sms_row.operator,
    'matched_order_id', v_clean_order
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_bf_sms_payment_for_sale(TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_bf_sms_payment_for_sale(TEXT, TEXT, NUMERIC) TO service_role;

-- ------------------------------------------------------------------------------
-- 4. CORRECTION DES RÉGRESSIONS RLS DE `20261122020000_dashboard_production_tables.sql`
--    (Suppression des policies FOR ALL TO authenticated USING (true) sur tables financières !)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_expr TEXT;
  v_col TEXT;
BEGIN
  -- 4.1 merchant_subscriptions : écriture service_role uniquement ; lecture propriétaire uniquement
  IF to_regclass('public.merchant_subscriptions') IS NOT NULL THEN
    ALTER TABLE public.merchant_subscriptions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS merchant_subscriptions_auth_all ON public.merchant_subscriptions;
    DROP POLICY IF EXISTS merchant_subscriptions_service_all ON public.merchant_subscriptions;
    DROP POLICY IF EXISTS merchant_subscriptions_owner_select ON public.merchant_subscriptions;

    CREATE POLICY merchant_subscriptions_service_all
      ON public.merchant_subscriptions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    v_expr := 'public.nana_rls_is_super_admin()';
    FOR v_col IN
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'merchant_subscriptions'
        AND column_name IN ('tenant_id', 'universe_id', 'user_id', 'owner_id', 'merchant_id')
    LOOP
      v_expr := v_expr || format(' OR public.nana_rls_owns_tenant(%I::text)', v_col);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY merchant_subscriptions_owner_select ON public.merchant_subscriptions FOR SELECT TO authenticated USING (%s)',
      v_expr
    );
  END IF;

  -- 4.2 wallet_transactions : écriture service_role uniquement ; lecture propriétaire uniquement
  IF to_regclass('public.wallet_transactions') IS NOT NULL THEN
    ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS wallet_transactions_auth_all ON public.wallet_transactions;
    DROP POLICY IF EXISTS wallet_transactions_auth_select ON public.wallet_transactions;
    DROP POLICY IF EXISTS wallet_transactions_owner_select ON public.wallet_transactions;
    DROP POLICY IF EXISTS wallet_transactions_service_role_all ON public.wallet_transactions;

    CREATE POLICY wallet_transactions_service_role_all
      ON public.wallet_transactions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    v_expr := 'public.nana_rls_is_super_admin()';
    FOR v_col IN
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'wallet_transactions'
        AND column_name IN ('user_id', 'universe_id', 'tenant_id', 'owner_id', 'wallet_id', 'merchant_id')
    LOOP
      v_expr := v_expr || format(' OR public.nana_rls_owns_tenant(%I::text)', v_col);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY wallet_transactions_owner_select ON public.wallet_transactions FOR SELECT TO authenticated USING (%s)',
      v_expr
    );
  END IF;

  -- 4.3 merchant_disputes : isolation par propriétaire (tenant_id / merchant_id / user_id)
  IF to_regclass('public.merchant_disputes') IS NOT NULL THEN
    ALTER TABLE public.merchant_disputes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS merchant_disputes_auth_all ON public.merchant_disputes;
    DROP POLICY IF EXISTS merchant_disputes_service_all ON public.merchant_disputes;
    DROP POLICY IF EXISTS merchant_disputes_owner_access ON public.merchant_disputes;

    CREATE POLICY merchant_disputes_service_all
      ON public.merchant_disputes
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    v_expr := 'public.nana_rls_is_super_admin()';
    FOR v_col IN
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'merchant_disputes'
        AND column_name IN ('tenant_id', 'merchant_id', 'universe_id', 'user_id', 'owner_id')
    LOOP
      v_expr := v_expr || format(' OR public.nana_rls_owns_tenant(%I::text)', v_col);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY merchant_disputes_owner_access ON public.merchant_disputes FOR SELECT TO authenticated USING (%s)',
      v_expr
    );
  END IF;

  -- 4.4 support_tickets : isolation par propriétaire (tenant_id / merchant_id / user_id)
  IF to_regclass('public.support_tickets') IS NOT NULL THEN
    ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS support_tickets_auth_all ON public.support_tickets;
    DROP POLICY IF EXISTS support_tickets_service_all ON public.support_tickets;
    DROP POLICY IF EXISTS support_tickets_owner_access ON public.support_tickets;

    CREATE POLICY support_tickets_service_all
      ON public.support_tickets
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    v_expr := 'public.nana_rls_is_super_admin()';
    FOR v_col IN
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'support_tickets'
        AND column_name IN ('tenant_id', 'merchant_id', 'universe_id', 'user_id', 'owner_id')
    LOOP
      v_expr := v_expr || format(' OR public.nana_rls_owns_tenant(%I::text)', v_col);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY support_tickets_owner_access ON public.support_tickets FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
      v_expr,
      v_expr
    );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. ISOLATION STRICTE SUR `public.funnels` (ANTI-STORED XSS INTER-MARCHANDS)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_expr TEXT := 'public.nana_rls_is_super_admin()';
  v_col TEXT;
BEGIN
  IF to_regclass('public.funnels') IS NOT NULL THEN
    ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS funnels_auth_write ON public.funnels;
    DROP POLICY IF EXISTS funnels_owner_write ON public.funnels;

    FOR v_col IN
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'funnels'
        AND column_name IN ('tenant_id', 'user_id', 'owner_id', 'universe_id', 'merchant_id', 'organization_id')
    LOOP
      v_expr := v_expr || format(' OR public.nana_rls_owns_tenant(%I::text)', v_col);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY funnels_owner_write ON public.funnels FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
      v_expr,
      v_expr
    );
  END IF;
END $$;
