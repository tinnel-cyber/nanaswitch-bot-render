-- ==============================================================================
-- Migration : Liens de Paiement Autonomes (Libellé, Description, Marchand affilié)
--             & Synchronisation Routeur NanaSwitch (Clés API + Webhooks)
-- ==============================================================================

-- 1. Enrichissement de public.payment_links
ALTER TABLE public.payment_links ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.payment_links ADD COLUMN IF NOT EXISTS merchant_name TEXT DEFAULT '';
ALTER TABLE public.payment_links ADD COLUMN IF NOT EXISTS merchant_sector TEXT DEFAULT '';
ALTER TABLE public.payment_links ADD COLUMN IF NOT EXISTS owner_id UUID;

CREATE INDEX IF NOT EXISTS idx_payment_links_owner ON public.payment_links (owner_id, created_at DESC);

-- Permettre la lecture publique (anonyme) d'un lien de paiement actif par un client payeur
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_links' AND policyname = 'payment_links_public_read_active'
  ) THEN
    CREATE POLICY payment_links_public_read_active ON public.payment_links
      FOR SELECT TO anon, authenticated
      USING (is_active = TRUE);
  END IF;
END $$;

-- 2. Enrichissement de public.nanaswitch_merchants pour synchronisation directe avec le Routeur
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'nanaswitch_merchants'
  ) THEN
    ALTER TABLE public.nanaswitch_merchants ADD COLUMN IF NOT EXISTS owner_id UUID;
    ALTER TABLE public.nanaswitch_merchants ADD COLUMN IF NOT EXISTS webhook_url TEXT;
    ALTER TABLE public.nanaswitch_merchants ADD COLUMN IF NOT EXISTS webhook_config JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.nanaswitch_merchants ADD COLUMN IF NOT EXISTS integration_mode TEXT DEFAULT 'AGREGATED';
  END IF;
END $$;
