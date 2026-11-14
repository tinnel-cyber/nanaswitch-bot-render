-- ==============================================================================
-- Schema Supabase : Gestion Multi-Univers par Marchand (Appellation & Secteur)
-- Fichier : supabase/migrations/20261112_merchant_universes.sql
-- Description : Permet à chaque marchand de créer et gérer plusieurs univers 
--               d'encaissement et de commerce selon son appellation / secteur d'activité.
-- ==============================================================================

-- 1. Table public.universes
CREATE TABLE IF NOT EXISTS public.universes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    appellation TEXT NOT NULL DEFAULT 'E-commerce & Vente en ligne',
    sector TEXT NULL,
    type TEXT NOT NULL DEFAULT 'entreprise' CHECK (type IN ('entreprise', 'particulier')),
    status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (status IN ('VERIFIED', 'PENDING_KYC', 'REJECTED', 'ACTIVE', 'INACTIVE')),
    
    -- Soldes financiers multi-devises de l'Univers
    balances JSONB NOT NULL DEFAULT '{"XOF": 0, "USD": 0, "XAF": 0, "GNF": 0, "GHS": 0}'::jsonb,
    
    -- Clés API et Webhooks propres à cet Univers
    keys JSONB NOT NULL DEFAULT '{}'::jsonb,
    webhook_config JSONB NOT NULL DEFAULT '{"url": null, "secret_key": "", "is_active": false}'::jsonb,
    
    -- Informations KYC et légales de cet Univers
    kyc_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Intégration (AGREGATED ou BYOK)
    integration_mode TEXT NOT NULL DEFAULT 'AGREGATED' CHECK (integration_mode IN ('AGREGATED', 'BYOK')),
    integration_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Paramètres et personnalisation de l'Univers
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_universe_slug UNIQUE (user_id, slug)
);

-- Commentaires explicatifs pour la documentation de la base
COMMENT ON TABLE public.universes IS 'Table des univers commerciaux créés par les marchands (multi-univers selon appellation/secteur).';
COMMENT ON COLUMN public.universes.id IS 'Identifiant UUID unique de l''univers.';
COMMENT ON COLUMN public.universes.user_id IS 'Propriétaire de l''univers (référence auth.users).';
COMMENT ON COLUMN public.universes.name IS 'Nom commercial de l''univers.';
COMMENT ON COLUMN public.universes.appellation IS 'Appellation ou secteur d''activité de l''univers.';
COMMENT ON COLUMN public.universes.balances IS 'Soldes multi-devises en temps réel (XOF, USD, XAF, etc.).';
COMMENT ON COLUMN public.universes.keys IS 'Paires de clés API (public/secret) assignées à cet univers.';

-- 2. Index de performance
CREATE INDEX IF NOT EXISTS idx_universes_user_id ON public.universes (user_id);
CREATE INDEX IF NOT EXISTS idx_universes_slug ON public.universes (slug);
CREATE INDEX IF NOT EXISTS idx_universes_status ON public.universes (status);
CREATE INDEX IF NOT EXISTS idx_universes_appellation ON public.universes (appellation);

-- 3. Activation de la sécurité au niveau des lignes (Row Level Security - RLS)
ALTER TABLE public.universes ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS strictes :
-- Un marchand connecté peut uniquement lire, insérer, mettre à jour et supprimer SES propres univers
DROP POLICY IF EXISTS "Les marchands voient leurs propres univers" ON public.universes;
CREATE POLICY "Les marchands voient leurs propres univers"
    ON public.universes
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les marchands créent leurs propres univers" ON public.universes;
CREATE POLICY "Les marchands créent leurs propres univers"
    ON public.universes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les marchands modifient leurs propres univers" ON public.universes;
CREATE POLICY "Les marchands modifient leurs propres univers"
    ON public.universes
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les marchands suppriment leurs propres univers" ON public.universes;
CREATE POLICY "Les marchands suppriment leurs propres univers"
    ON public.universes
    FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Trigger updated_at automatique pour la table universes
CREATE OR REPLACE FUNCTION public.handle_universes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_universes_updated_at ON public.universes;
CREATE TRIGGER set_universes_updated_at
    BEFORE UPDATE ON public.universes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_universes_updated_at();
