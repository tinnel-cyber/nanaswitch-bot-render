-- ==============================================================================
-- MIGRATION SUPABASE : MODULES REALTIME FULL-SUITE NANASORE
-- Couvre : POS/Stock, Paiements, Wameet, KYC, Live/Webinaire, DocuSign, IA, E-mailing, LMS
-- Date : 2026-11-08
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. MODULE WAMEET (Messagerie & Tiers de Confiance Escrow)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wameet_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT,
    recipient_id TEXT,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wameet_messages_conv ON public.wameet_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wameet_messages_sender ON public.wameet_messages (sender_id);
ALTER TABLE public.wameet_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wameet_messages_policy" ON public.wameet_messages;
CREATE POLICY "wameet_messages_policy" ON public.wameet_messages FOR ALL USING (true) WITH CHECK (true);

-- Escrow / Séquestre Tripartite Wameet
CREATE TABLE IF NOT EXISTS public.escrow_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    mediator_id TEXT,
    title TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'XOF',
    status TEXT NOT NULL DEFAULT 'deposit_pending' CHECK (status IN ('deposit_pending', 'funded', 'in_progress', 'delivered', 'released', 'disputed', 'refunded')),
    conditions JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON public.escrow_projects (buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_seller ON public.escrow_projects (seller_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON public.escrow_projects (status);
ALTER TABLE public.escrow_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "escrow_projects_policy" ON public.escrow_projects;
CREATE POLICY "escrow_projects_policy" ON public.escrow_projects FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 2. MODULE WEBINAR & LIVE SHOPPING (Scène de Vente Flash)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT,
    host_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_live BOOLEAN NOT NULL DEFAULT FALSE,
    viewer_count INT NOT NULL DEFAULT 0,
    pinned_product_id TEXT,
    pinned_product_data JSONB,
    flash_sale_end_at TIMESTAMPTZ,
    stream_url TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_tenant ON public.live_sessions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_host ON public.live_sessions (host_id);
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "live_sessions_policy" ON public.live_sessions;
CREATE POLICY "live_sessions_policy" ON public.live_sessions FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 3. MODULE DOCUSIGN HUB (Contrats & Devis Signés)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.docusign_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT,
    creator_id TEXT NOT NULL,
    signer_name TEXT NOT NULL,
    signer_email TEXT NOT NULL,
    signer_phone TEXT,
    title TEXT NOT NULL,
    document_url TEXT NOT NULL,
    signed_document_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'signed', 'rejected')),
    signature_data TEXT,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON public.docusign_contracts (tenant_id);
ALTER TABLE public.docusign_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contracts_policy" ON public.docusign_contracts;
CREATE POLICY "contracts_policy" ON public.docusign_contracts FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 4. MODULE NANAGENERATOR & STUDIO IA (Génération Vidéo Asynchrone)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.video_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    tenant_id TEXT,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    progress_percent INT NOT NULL DEFAULT 0,
    video_url TEXT,
    thumbnail_url TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_gen_user ON public.video_generations (user_id);
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "video_gen_policy" ON public.video_generations;
CREATE POLICY "video_gen_policy" ON public.video_generations FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 5. PUBLICATION SUPABASE REALTIME (WebSockets pour tous les modules)
-- ==============================================================================
DO $$
DECLARE
    tbl text;
    realtime_tables text[] := ARRAY[
        'inventory_movements',
        'sales',
        'orders',
        'verification_requests',
        'wameet_messages',
        'escrow_projects',
        'live_sessions',
        'docusign_contracts',
        'video_generations',
        'email_campaigns',
        'enrollments'
    ];
BEGIN
    FOREACH tbl IN ARRAY realtime_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' AND tablename = tbl
            ) THEN
                BEGIN
                    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
            END IF;
        END IF;
    END LOOP;
END $$;
