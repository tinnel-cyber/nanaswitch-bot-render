-- ==============================================================================
-- MIGRATION SUPABASE : MIGRATION THÈMES & APP_REGISTRY VERS REALTIME
-- Tables cibles : public.app_registry & public.organization_blocks
-- Date : 2026-11-08
-- ==============================================================================

-- 1. Extension des colonnes pour la configuration multi-tenant des thèmes dans app_registry
ALTER TABLE public.app_registry 
    ADD COLUMN IF NOT EXISTS tenant_id TEXT,
    ADD COLUMN IF NOT EXISTS module_key TEXT,
    ADD COLUMN IF NOT EXISTS theme_key TEXT,
    ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Index de performance et contrainte d'unicité pour les upserts de configuration
CREATE INDEX IF NOT EXISTS idx_app_registry_tenant_id ON public.app_registry (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_registry_tenant_module ON public.app_registry (tenant_id, module_key) WHERE tenant_id IS NOT NULL AND module_key IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'app_registry_tenant_module_key_unique'
    ) THEN
        ALTER TABLE public.app_registry 
        ADD CONSTRAINT app_registry_tenant_module_key_unique UNIQUE (tenant_id, module_key);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Sécurité RLS pour app_registry (Lecture publique pour la boutique en ligne, écriture authentifiée)
ALTER TABLE public.app_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_registry_public_read" ON public.app_registry;
CREATE POLICY "app_registry_public_read" ON public.app_registry
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "app_registry_authenticated_upsert" ON public.app_registry;
CREATE POLICY "app_registry_authenticated_upsert" ON public.app_registry
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4. Sécurité RLS pour organization_blocks
ALTER TABLE public.organization_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_blocks_public_read" ON public.organization_blocks;
CREATE POLICY "organization_blocks_public_read" ON public.organization_blocks
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "organization_blocks_authenticated_all" ON public.organization_blocks;
CREATE POLICY "organization_blocks_authenticated_all" ON public.organization_blocks
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 5. Activation de la réplication Supabase Realtime (postgres_changes)
DO $$
BEGIN
    -- Publication pour app_registry
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'app_registry'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.app_registry;
    END IF;

    -- Publication pour organization_blocks
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'organization_blocks'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_blocks;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
