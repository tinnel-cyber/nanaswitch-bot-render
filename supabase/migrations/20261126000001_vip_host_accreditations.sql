-- Migration: Table Supabase SQL pour les Accréditations Hôtes Salons VIP & Compteur +5%
CREATE TABLE IF NOT EXISTS public.vip_host_accreditations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  universe_id TEXT NOT NULL,
  email TEXT,
  full_name TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  grade TEXT NOT NULL DEFAULT 'NON_ELIGIBLE',
  badges JSONB NOT NULL DEFAULT '[]'::jsonb,
  sectors JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_activated BOOLEAN NOT NULL DEFAULT FALSE,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  activation_price_paid_xof INTEGER,
  monthly_fee_xof INTEGER NOT NULL DEFAULT 40000,
  multi_streaming_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  transaction_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vip_host_acc_user ON public.vip_host_accreditations(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_host_acc_universe ON public.vip_host_accreditations(universe_id);
CREATE INDEX IF NOT EXISTS idx_vip_host_acc_activated ON public.vip_host_accreditations(is_activated);

ALTER TABLE public.vip_host_accreditations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture propre accréditation VIP" ON public.vip_host_accreditations;
CREATE POLICY "Lecture propre accréditation VIP"
  ON public.vip_host_accreditations FOR SELECT
  USING (
    auth.uid()::text = user_id
    OR public.is_super_admin(auth.uid())
  );
