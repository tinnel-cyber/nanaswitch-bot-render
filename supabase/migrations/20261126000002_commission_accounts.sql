-- Migration: Table dédiée pour les marchands/créateurs sous Plan Commission
-- Sépare strictement : subscriptions (abonnés) | payg_entitlements (Pay-As-You-Go) | commission_accounts (Plan Commission)

CREATE TABLE IF NOT EXISTS public.commission_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  universe_id TEXT NOT NULL,
  email TEXT,
  store_name TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'SWITCHED_TO_SUBSCRIPTION', 'SWITCHED_TO_PAYG')),
  commission_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  total_sales_xof BIGINT NOT NULL DEFAULT 0,
  total_commission_xof BIGINT NOT NULL DEFAULT 0,
  total_net_merchant_xof BIGINT NOT NULL DEFAULT 0,
  transactions_count INTEGER NOT NULL DEFAULT 0,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_acc_user ON public.commission_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_acc_universe ON public.commission_accounts(universe_id);
CREATE INDEX IF NOT EXISTS idx_commission_acc_status ON public.commission_accounts(status);

CREATE TABLE IF NOT EXISTS public.commission_transactions (
  id TEXT PRIMARY KEY,
  commission_account_id TEXT NOT NULL REFERENCES public.commission_accounts(id) ON DELETE CASCADE,
  universe_id TEXT NOT NULL,
  order_ref TEXT NOT NULL,
  gross_amount_xof BIGINT NOT NULL,
  commission_rate_percent NUMERIC(5,2) NOT NULL,
  commission_amount_xof BIGINT NOT NULL,
  net_merchant_xof BIGINT NOT NULL,
  channel TEXT DEFAULT 'DIGITAL_SALE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_tx_account ON public.commission_transactions(commission_account_id);
CREATE INDEX IF NOT EXISTS idx_commission_tx_universe ON public.commission_transactions(universe_id);

ALTER TABLE public.commission_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture propre compte commission" ON public.commission_accounts;
CREATE POLICY "Lecture propre compte commission"
  ON public.commission_accounts FOR SELECT
  USING (
    auth.uid()::text = user_id
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Lecture propres transactions commission" ON public.commission_transactions;
CREATE POLICY "Lecture propres transactions commission"
  ON public.commission_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.commission_accounts ca
      WHERE ca.id = commission_account_id
      AND (ca.user_id = auth.uid()::text OR public.is_super_admin(auth.uid()))
    )
  );
