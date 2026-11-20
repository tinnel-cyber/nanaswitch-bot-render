-- ==============================================================================
-- MIGRATION SUPABASE UNIFIÉE : VITRINE PUBLIQUE NSORE.SHOP, RLS & REALTIME 0MS
-- Date : 2026-11-12
-- Cibles : public.app_registry, public.tenants, public.products
-- ==============================================================================

-- 1. SÉCURITÉ ROW LEVEL SECURITY (RLS) & LECTURE PUBLIQUE (ANON)
-- ==============================================================================

-- A. Table public.app_registry (Configuration des thèmes et modules)
ALTER TABLE public.app_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_registry_public_read" ON public.app_registry;
CREATE POLICY "app_registry_public_read" ON public.app_registry
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "app_registry_authenticated_upsert" ON public.app_registry;
CREATE POLICY "app_registry_authenticated_upsert" ON public.app_registry
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- B. Table public.tenants (Boutiques, domaines et personnalisation)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_public_read" ON public.tenants;
CREATE POLICY "tenants_public_read" ON public.tenants
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "tenants_authenticated_manage" ON public.tenants;
CREATE POLICY "tenants_authenticated_manage" ON public.tenants
    FOR ALL TO authenticated
    USING (owner_id = auth.uid() OR owner_id IS NULL)
    WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

-- C. Table public.products (Articles et catalogue e-commerce)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read" ON public.products
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "products_authenticated_manage" ON public.products;
CREATE POLICY "products_authenticated_manage" ON public.products
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. REPLICA IDENTITY FULL POUR TRANSFÉRER TOUTES LES DONNÉES EN REALTIME
-- ==============================================================================
ALTER TABLE public.app_registry REPLICA IDENTITY FULL;
ALTER TABLE public.tenants REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;

-- 3. ACTIVATION DE LA PUBLICATION SUPABASE REALTIME (0MS DE LATENCE)
-- ==============================================================================
DO $$
BEGIN
    -- Publication pour app_registry (diffusion 0ms des changements de thèmes/couleurs)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'app_registry'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.app_registry;
    END IF;

    -- Publication pour tenants (mise à jour du slug, nom, logo)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'tenants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
    END IF;

    -- Publication pour products (mise à jour de stock, prix, ajouts de produits)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. VÉRIFICATION DES COLONNES NÉCESSAIRES SUR PUBLIC.PRODUCTS
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.products ADD COLUMN tenant_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'organization_id') THEN
        ALTER TABLE public.products ADD COLUMN organization_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'image_url') THEN
        ALTER TABLE public.products ADD COLUMN image_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE public.products ADD COLUMN thumbnail_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'slug') THEN
        ALTER TABLE public.products ADD COLUMN slug TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON public.products (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug) WHERE slug IS NOT NULL;
