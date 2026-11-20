-- MIGRATION SUPABASE : Table academic_uploads & Module Espace Upload Académique
-- Date : 2026-11-04
-- Contexte : Module d'Upload Unifié Professeurs & Étudiants (Cours, Devoirs & Rendus)

-- 1. Création de la table `academic_uploads`
CREATE TABLE IF NOT EXISTS public.academic_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('professeur', 'etudiant')),
    upload_type TEXT NOT NULL CHECK (upload_type IN ('cours', 'rendu')),
    file_key TEXT NOT NULL,
    file_size TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour requêtes par utilisateur, rôle et type
CREATE INDEX IF NOT EXISTS idx_academic_uploads_user_id ON public.academic_uploads (user_id);
CREATE INDEX IF NOT EXISTS idx_academic_uploads_role ON public.academic_uploads (role);
CREATE INDEX IF NOT EXISTS idx_academic_uploads_upload_type ON public.academic_uploads (upload_type);
CREATE INDEX IF NOT EXISTS idx_academic_uploads_created_at ON public.academic_uploads (created_at DESC);

-- 2. Sécurité RLS
ALTER TABLE public.academic_uploads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'academic_uploads' AND policyname = 'academic_uploads_select_policy'
    ) THEN
        CREATE POLICY academic_uploads_select_policy ON public.academic_uploads FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'academic_uploads' AND policyname = 'academic_uploads_insert_policy'
    ) THEN
        CREATE POLICY academic_uploads_insert_policy ON public.academic_uploads FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- 3. Mise à jour de l'App Registry dans Supabase
INSERT INTO public.app_registry (key, name, description, category, is_public)
VALUES (
    'vendor-upload',
    'Espace Upload Académique',
    'Module d''upload unifié de cours, devoirs et rendus (Compression ZIP & R2)',
    'academic',
    TRUE
)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    is_public = EXCLUDED.is_public;
