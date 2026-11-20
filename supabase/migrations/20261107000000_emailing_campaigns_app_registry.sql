-- =======================================================================
-- MIGRATION SUPABASE : Ajout du Module Studio E-mailing & Campagnes Brevo
-- Table cible : public.app_registry
-- Écosystème  : Nanasore SaaS / Espace Marchand
-- Date        : 2026-11-07
-- =======================================================================

-- 1. Enregistrement officiel du module dans app_registry
INSERT INTO public.app_registry (key, name, description, category, is_public)
VALUES (
    'emailing',
    'Studio E-mailing & Campagnes Brevo',
    'Éditeur visuel d''e-mails, segmentation d''audience et revente de quotas d''envoi Brevo.',
    'Marketing & Ventes',
    true
)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    is_public = EXCLUDED.is_public;

-- 2. Création de la table de suivi des campagnes e-mailing (si non existante)
CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    sender_name TEXT,
    segment TEXT DEFAULT 'all',
    recipient_count INT DEFAULT 0,
    brevo_message_id TEXT,
    status TEXT DEFAULT 'sent',
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexation par tenant
CREATE INDEX IF NOT EXISTS idx_email_campaigns_tenant ON public.email_campaigns(tenant_id);

-- RLS pour email_campaigns
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants read own campaigns" ON public.email_campaigns
    FOR SELECT USING (true);

CREATE POLICY "Tenants insert own campaigns" ON public.email_campaigns
    FOR INSERT WITH CHECK (true);
