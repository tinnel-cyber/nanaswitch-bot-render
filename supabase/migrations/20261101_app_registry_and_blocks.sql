-- =======================================================================
-- MIGRATION SUPABASE : App Registry & Blocs Multi-Tenant (Nanasore SaaS)
-- =======================================================================

-- 1. Catalogue global des blocs / modules Nanasore (App Registry)
CREATE TABLE IF NOT EXISTS public.app_registry (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,            -- ex: 'pos_cashier', 'whatsapp_bot', 'lms_courses'
    name TEXT NOT NULL,                   -- Nom du bloc
    description TEXT,
    category TEXT DEFAULT 'General',
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide par clé
CREATE INDEX IF NOT EXISTS idx_app_registry_key ON public.app_registry (key);

-- 2. Table de liaison : Blocs activés par chaque Organisation (Multi-Tenant)
CREATE TABLE IF NOT EXISTS public.organization_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    block_key TEXT REFERENCES public.app_registry(key) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}'::jsonb,   -- Configuration spécifique du bloc
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, block_key)
);

-- Index de performance pour requêter rapidement les blocs d'une organisation
CREATE INDEX IF NOT EXISTS idx_organization_blocks_org_id ON public.organization_blocks (organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_blocks_key ON public.organization_blocks (block_key);

-- 3. Fonction stockée PostgreSQL (RPC) : Activation / Publication atomique depuis l'Omnibar
CREATE OR REPLACE FUNCTION public.publish_organization_block(
    p_org_id UUID,
    p_block_key TEXT,
    p_is_active BOOLEAN,
    p_settings JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insertion ou mise à jour atomique de l'état du bloc pour l'organisation
    INSERT INTO public.organization_blocks (organization_id, block_key, is_active, settings, updated_at)
    VALUES (p_org_id, p_block_key, p_is_active, p_settings, NOW())
    ON CONFLICT (organization_id, block_key)
    DO UPDATE SET 
        is_active = EXCLUDED.is_active,
        settings = EXCLUDED.settings,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Bloc mis à jour avec succès dans le registre Supabase'
    );
END;
$$;

-- 4. Sécurité RLS (Row Level Security)
ALTER TABLE public.app_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_blocks ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour lecture et écriture
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_registry' AND policyname = 'app_registry_read_policy'
    ) THEN
        CREATE POLICY app_registry_read_policy ON public.app_registry FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'organization_blocks' AND policyname = 'organization_blocks_all_policy'
    ) THEN
        CREATE POLICY organization_blocks_all_policy ON public.organization_blocks FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- 5. Seed initial des blocs phares Nanasore dans app_registry
INSERT INTO public.app_registry (key, name, description, category, is_public)
VALUES 
    ('pos_cashier', 'Caisse Enregistreuse POS', 'Point de vente rapide et gestion du tiroir-caisse', 'Commerce', true),
    ('whatsapp_bot', 'Assistant Commercial WhatsApp', 'Relance automatique et notifications de commande', 'Marketing', true),
    ('lms_courses', 'Campus E-Learning & Masterclass', 'Plateforme de cours vidéo et quiz interactifs', 'Formation', true),
    ('live_stream', 'Live Shopping & Farotage', 'Sessions live streaming avec vente interactive', 'Vente Directe', true),
    ('smart_haggle', 'Négociateur Intelligent IA', 'Escrow et négociation de prix assistée par IA', 'Fintech', true),
    ('omni_funnel', 'Constructeur de Tunnels Modulaire', 'Tunnels de conversion 12 blocs et commande 1-clic', 'Conversion', true)
ON CONFLICT (key) DO NOTHING;
