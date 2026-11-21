-- ==============================================================================
-- Migration : Système de Plaques & Tags NFC Dynamiques Nanasore (/nfc/:code)
-- Permet la fabrication en lots (NS-0001..NS-0100), l'activation 1-clic par le
-- marchand et la redirection instantanée des clients vers le Mini-Market.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.nfc_tags (
  code TEXT PRIMARY KEY,
  batch_name TEXT NOT NULL DEFAULT 'Lot Standard',
  status TEXT NOT NULL DEFAULT 'UNCLAIMED' CHECK (status IN ('UNCLAIMED', 'ACTIVE', 'DISABLED')),
  owner_id UUID,
  merchant_id TEXT,
  merchant_name TEXT DEFAULT '',
  target_type TEXT NOT NULL DEFAULT 'minimarket',
  target_slug TEXT DEFAULT '',
  target_url TEXT DEFAULT '',
  scan_count INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nfc_tags_owner ON public.nfc_tags (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nfc_tags_status ON public.nfc_tags (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nfc_tags_batch ON public.nfc_tags (batch_name);

ALTER TABLE public.nfc_tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Lecture publique (permet la résolution /nfc/:code par n'importe quel client)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'nfc_tags' AND policyname = 'nfc_tags_public_read'
  ) THEN
    CREATE POLICY nfc_tags_public_read ON public.nfc_tags
      FOR SELECT TO anon, authenticated
      USING (status IN ('UNCLAIMED', 'ACTIVE'));
  END IF;

  -- Mise à jour par le propriétaire, lors de l'activation d'une plaque vierge, ou par un Super Admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'nfc_tags' AND policyname = 'nfc_tags_owner_or_claim_update'
  ) THEN
    CREATE POLICY nfc_tags_owner_or_claim_update ON public.nfc_tags
      FOR UPDATE TO authenticated
      USING (
        status = 'UNCLAIMED'
        OR owner_id = auth.uid()
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
  END IF;

  -- Création de lots réservée aux administrateurs / utilisateurs authentifiés (contrôlé aussi côté API)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'nfc_tags' AND policyname = 'nfc_tags_admin_insert'
  ) THEN
    CREATE POLICY nfc_tags_admin_insert ON public.nfc_tags
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND LOWER(COALESCE(p.role, '')) IN ('super_admin', 'admin')
        )
      );
  END IF;
END $$;
