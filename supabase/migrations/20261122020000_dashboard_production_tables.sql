-- ==============================================================================
-- Migration Production Dashboard : Abonnements, Retraits, Litiges & Support
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.merchant_subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  transaction_id TEXT,
  payment_method TEXT DEFAULT 'MOBILE_MONEY',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_tenant ON public.merchant_subscriptions (tenant_id, activated_at DESC);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id TEXT PRIMARY KEY,
  universe_id TEXT NOT NULL,
  user_id UUID,
  type TEXT NOT NULL DEFAULT 'WITHDRAWAL',
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_universe ON public.wallet_transactions (universe_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.merchant_disputes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  transaction_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_disputes_tenant ON public.merchant_disputes (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  store_name TEXT DEFAULT '',
  subject TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'NORMAL',
  category TEXT NOT NULL DEFAULT 'TECHNICAL',
  category_label TEXT DEFAULT 'Technique',
  description TEXT NOT NULL,
  ref_id TEXT,
  contact_phone TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'OPEN',
  response_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON public.support_tickets (tenant_id, created_at DESC);

ALTER TABLE public.merchant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_subscriptions' AND policyname = 'merchant_subscriptions_auth_all') THEN
    CREATE POLICY merchant_subscriptions_auth_all ON public.merchant_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallet_transactions' AND policyname = 'wallet_transactions_auth_all') THEN
    CREATE POLICY wallet_transactions_auth_all ON public.wallet_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_disputes' AND policyname = 'merchant_disputes_auth_all') THEN
    CREATE POLICY merchant_disputes_auth_all ON public.merchant_disputes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'support_tickets_auth_all') THEN
    CREATE POLICY support_tickets_auth_all ON public.support_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
