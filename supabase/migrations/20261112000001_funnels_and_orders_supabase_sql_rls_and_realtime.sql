-- ==============================================================================
-- MIGRATION SUPABASE UNIFIÉE : TUNNELS DE VENTE & COMMANDES CAISSE EXPRESS (RLS & REALTIME)
-- Date : 2026-11-12
-- Cibles : public.funnels, public.orders
-- ==============================================================================

-- 1. TABLE DES TUNNELS DE VENTE (PHYSICAL FUNNEL BUILDER & ULTIMATE TUNNELS)
CREATE TABLE IF NOT EXISTS public.funnels (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_published BOOLEAN DEFAULT true,
    user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour résolution ultra-rapide par slug (nsore.shop/c/:slug ou /f/:slug)
CREATE INDEX IF NOT EXISTS idx_funnels_slug ON public.funnels(slug);
CREATE INDEX IF NOT EXISTS idx_funnels_user_id ON public.funnels(user_id);

-- 2. TABLE DES COMMANDES DU TUNNEL ET DE LA CAISSE EXPRESS
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    funnel_slug TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'FCFA',
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending_on_delivery',
    payment_provider TEXT DEFAULT 'CASH_ON_DELIVERY',
    delivery_option JSONB DEFAULT '{}'::jsonb,
    items JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    tenant_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche de commandes
CREATE INDEX IF NOT EXISTS idx_orders_funnel_slug ON public.orders(funnel_slug);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 3. SÉCURITÉ ROW LEVEL SECURITY (RLS)
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Politiques funnels : Consultation publique des tunnels publiés
DROP POLICY IF EXISTS "funnels_public_read" ON public.funnels;
CREATE POLICY "funnels_public_read" ON public.funnels
    FOR SELECT TO anon, authenticated
    USING (is_published = true);

DROP POLICY IF EXISTS "funnels_authenticated_manage" ON public.funnels;
CREATE POLICY "funnels_authenticated_manage" ON public.funnels
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Politiques orders : Création de commandes par les acheteurs (anonymes ou connectés)
DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
CREATE POLICY "orders_public_insert" ON public.orders
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "orders_read_policy" ON public.orders;
CREATE POLICY "orders_read_policy" ON public.orders
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
CREATE POLICY "orders_update_policy" ON public.orders
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 4. REPLICA IDENTITY FULL POUR SUPABASE REALTIME
ALTER TABLE public.funnels REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- 5. AJOUT À LA PUBLICATION REALTIME
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'funnels'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.funnels;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
END $$;
