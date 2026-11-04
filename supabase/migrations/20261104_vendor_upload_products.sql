-- MIGRATION SUPABASE : Support Module Vendor-Upload & Table Products
-- Date : 2026-11-04
-- Module : Studio Upload Vendeur (Compression ZIP & Coffre R2)

-- 1. S'assurer que la table `products` existe et possède toutes les colonnes requises
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id TEXT,
    title TEXT,
    name TEXT,
    price NUMERIC DEFAULT 0,
    file_key TEXT,
    file_type TEXT,
    file_size TEXT,
    description TEXT,
    stock INT DEFAULT 0,
    category TEXT DEFAULT 'digital',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajout idempotent des colonnes au cas où la table `products` existait déjà préalablement
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'vendor_id') THEN
        ALTER TABLE public.products ADD COLUMN vendor_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'title') THEN
        ALTER TABLE public.products ADD COLUMN title TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'file_key') THEN
        ALTER TABLE public.products ADD COLUMN file_key TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'file_type') THEN
        ALTER TABLE public.products ADD COLUMN file_type TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'file_size') THEN
        ALTER TABLE public.products ADD COLUMN file_size TEXT;
    END IF;
END $$;

-- Index pour accélérer la recherche par vendor_id et file_key
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON public.products (vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_file_key ON public.products (file_key);

-- 2. Enregistrement officiel du module `vendor-upload` dans l'App Registry Supabase
INSERT INTO public.app_registry (key, name, description, category, is_public)
VALUES (
    'vendor-upload',
    'Studio Upload Vendeur',
    'Module de compression ZIP et stockage R2',
    'vendor',
    TRUE
)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    is_public = EXCLUDED.is_public;
