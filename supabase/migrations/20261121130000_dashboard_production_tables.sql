-- ==============================================================================
-- Migration Production Dashboard : Liens de paiement, Support, Litiges & Webhooks
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.payment_links (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  url TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  payments INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_links_tenant ON public.payment_links (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  store_name TEXT,
  subject TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MOYENNE',
  category TEXT NOT NULL DEFAULT 'AUTRE',
  category_label TEXT,
  description TEXT NOT NULL,
  ref_id TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  response_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON public.support_tickets (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.merchant_disputes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  transaction_id TEXT,
  customer_contact TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_disputes_tenant ON public.merchant_disputes (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  merchant_id TEXT,
  event TEXT NOT NULL,
  url TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 200,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant ON public.webhook_deliveries (tenant_id, created_at DESC);

-- RLS Policies (isolation multi-tenant)
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_links' AND policyname = 'payment_links_auth_access') THEN
    CREATE POLICY payment_links_auth_access ON public.payment_links
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'support_tickets_auth_access') THEN
    CREATE POLICY support_tickets_auth_access ON public.support_tickets
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_disputes' AND policyname = 'merchant_disputes_auth_access') THEN
    CREATE POLICY merchant_disputes_auth_access ON public.merchant_disputes
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_deliveries' AND policyname = 'webhook_deliveries_auth_access') THEN
    CREATE POLICY webhook_deliveries_auth_access ON public.webhook_deliveries
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;
