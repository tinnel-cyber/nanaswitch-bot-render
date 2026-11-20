-- =======================================================================
-- MIGRATION SUPABASE : Table de publication des tarifs Landing Page
-- Table : landing_pricing_config
-- Date : 2026-11-04
-- =======================================================================

CREATE TABLE IF NOT EXISTS public.landing_pricing_config (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
    title TEXT DEFAULT 'Des tarifs simples, transparents et sans surprise.',
    subtitle TEXT DEFAULT 'Choisissez le modèle adapté à votre activité : abonnement fixe 0% commission, formule créateur à la performance, ou services à l''acte sans engagement.',
    zero_commission_banner JSONB DEFAULT '{"title": "0% de Commission sur toutes vos Ventes Directes", "badge": "Garanti à Vie", "description": "Gardez 100% de votre chiffre d''affaires. Contrairement aux plateformes classiques, Nanasore n''applique aucun frais caché sur vos transactions encaissées."}'::jsonb,
    plans JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_by VARCHAR(255) DEFAULT 'Super-Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activation de RLS
ALTER TABLE public.landing_pricing_config ENABLE ROW LEVEL SECURITY;

-- Politiques RLS : Lecture publique et écriture autorisée
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'landing_pricing_config' AND policyname = 'landing_pricing_config_read'
    ) THEN
        CREATE POLICY landing_pricing_config_read ON public.landing_pricing_config FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'landing_pricing_config' AND policyname = 'landing_pricing_config_write'
    ) THEN
        CREATE POLICY landing_pricing_config_write ON public.landing_pricing_config FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
