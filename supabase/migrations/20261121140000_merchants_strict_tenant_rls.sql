-- ==============================================================================
-- Migration : Source unique de vérité Multi-Tenant pour les Univers Marchands
-- Sépare strictement owner_id (auth.uid()) et id (tenant_id de l'univers)
-- avec RLS PostgreSQL hermétique par propriétaire.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.merchants (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL,
  owner_email TEXT,
  name TEXT NOT NULL,
  sector TEXT DEFAULT 'E-commerce & Services',
  type TEXT NOT NULL DEFAULT 'entreprise',
  status TEXT NOT NULL DEFAULT 'PENDING_KYC',
  integration_mode TEXT NOT NULL DEFAULT 'AGREGATED',
  integration_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  balances JSONB NOT NULL DEFAULT '{"XOF":0,"USD":0,"XAF":0,"GNF":0,"GHS":0}'::jsonb,
  keys JSONB NOT NULL DEFAULT '{}'::jsonb,
  webhook_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  kyc_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  kyc_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  api_credits_balance INTEGER NOT NULL DEFAULT 5000,
  api_pricing_config JSONB NOT NULL DEFAULT '{"cost_per_request_xof":0.02,"api_credits_balance":5000,"low_balance_threshold":500}'::jsonb,
  monthly_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
  company_email TEXT,
  phone TEXT,
  bank_rib TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colonnes additionnelles si la table merchants existait déjà partiellement
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT 'E-commerce & Services';
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'entreprise';
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING_KYC';
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS integration_mode TEXT DEFAULT 'AGREGATED';
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS integration_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS balances JSONB DEFAULT '{"XOF":0,"USD":0,"XAF":0,"GNF":0,"GHS":0}'::jsonb;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS keys JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS webhook_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS kyc_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS kyc_limits JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS api_credits_balance INTEGER DEFAULT 5000;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS api_pricing_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS monthly_usage JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS company_email TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS bank_rib TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_merchants_owner_id ON public.merchants (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchants_owner_email ON public.merchants (owner_email);

-- Migration automatique des anciens univers présents dans app_registry (si UUID valide)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'app_registry'
  ) THEN
    INSERT INTO public.merchants (
      id, owner_id, owner_email, name, sector, type, status,
      integration_mode, integration_config, balances, keys,
      webhook_config, kyc_data, kyc_limits, api_credits_balance,
      created_at, updated_at
    )
    SELECT
      COALESCE(config_json->>'id', REPLACE(key, 'universe_', ''), id::text) AS id,
      tenant_id::uuid AS owner_id,
      COALESCE(config_json->'kyc'->>'userEmail', config_json->'kyc'->>'companyEmail', config_json->>'ownerEmail') AS owner_email,
      COALESCE(config_json->>'name', name, 'Univers Marchand') AS name,
      COALESCE(config_json->>'sector', 'E-commerce & Services') AS sector,
      COALESCE(config_json->>'type', 'entreprise') AS type,
      COALESCE(config_json->>'status', 'PENDING_KYC') AS status,
      COALESCE(config_json->>'integration_mode', 'AGREGATED') AS integration_mode,
      COALESCE(config_json->'integration_config', '{}'::jsonb) AS integration_config,
      COALESCE(config_json->'balances', '{"XOF":0,"USD":0,"XAF":0,"GNF":0,"GHS":0}'::jsonb) AS balances,
      COALESCE(config_json->'keys', '{}'::jsonb) AS keys,
      COALESCE(config_json->'webhook_config', '{}'::jsonb) AS webhook_config,
      COALESCE(config_json->'kyc', '{}'::jsonb) AS kyc_data,
      COALESCE(config_json->'kyc_limits', '{}'::jsonb) AS kyc_limits,
      COALESCE((config_json->>'api_credits_balance')::integer, 5000) AS api_credits_balance,
      NOW(),
      NOW()
    FROM public.app_registry
    WHERE category = 'Univers Marchand'
      AND tenant_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Activation stricte de la RLS sur public.merchants
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchants_owner_select ON public.merchants;
CREATE POLICY merchants_owner_select ON public.merchants
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND LOWER(COALESCE(p.role, '')) IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS merchants_owner_insert ON public.merchants;
CREATE POLICY merchants_owner_insert ON public.merchants
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS merchants_owner_update ON public.merchants;
CREATE POLICY merchants_owner_update ON public.merchants
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND LOWER(COALESCE(p.role, '')) IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND LOWER(COALESCE(p.role, '')) IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS merchants_owner_delete ON public.merchants;
CREATE POLICY merchants_owner_delete ON public.merchants
  FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND LOWER(COALESCE(p.role, '')) IN ('super_admin', 'admin')
    )
  );
