-- ==============================================================================
-- MIGRATION SUPABASE : MODULES CORE SaaS NANASORE
-- 1. Studio E-mailing (public.email_campaigns)
-- 2. Validation & Modération Comptes/KYC (public.verification_requests)
-- 3. Traçabilité Stock & Mouvements POS (public.inventory_movements)
-- Date : 2026-11-08
-- ==============================================================================

-- Extension nécessaire pour la génération d'UUID si non activée
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- MODULE A : STUDIO E-MAILING (Campagnes, Templates & Suivi d'Envoi)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    html_content TEXT,
    plain_text TEXT,
    sender_name TEXT,
    sender_email TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'failed')),
    target_segment TEXT DEFAULT 'all',
    recipients_count INT NOT NULL DEFAULT 0,
    sent_count INT NOT NULL DEFAULT 0,
    open_count INT NOT NULL DEFAULT 0,
    click_count INT NOT NULL DEFAULT 0,
    brevo_campaign_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index de performance E-mailing
CREATE INDEX IF NOT EXISTS idx_email_campaigns_tenant ON public.email_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created ON public.email_campaigns(created_at DESC);

-- Sécurité RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_campaigns_tenant_select" ON public.email_campaigns;
DROP POLICY IF EXISTS "email_campaigns_tenant_insert" ON public.email_campaigns;
DROP POLICY IF EXISTS "email_campaigns_tenant_update" ON public.email_campaigns;
DROP POLICY IF EXISTS "email_campaigns_tenant_delete" ON public.email_campaigns;

CREATE POLICY "email_campaigns_tenant_select" ON public.email_campaigns
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

CREATE POLICY "email_campaigns_tenant_insert" ON public.email_campaigns
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

CREATE POLICY "email_campaigns_tenant_update" ON public.email_campaigns
    FOR UPDATE USING (
        auth.role() = 'authenticated'
    );

CREATE POLICY "email_campaigns_tenant_delete" ON public.email_campaigns
    FOR DELETE USING (
        auth.role() = 'authenticated'
    );


-- ==============================================================================
-- MODULE B : VALIDATION DES COMPTES & MODÉRATION (Workflow Admin)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL DEFAULT 'ACCOUNT_CREATION' CHECK (request_type IN ('ACCOUNT_CREATION', 'KYC_VERIFICATION', 'SUBSCRIPTION_UPGRADE', 'STORE_ACTIVATION')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_review')),
    pricing_model TEXT CHECK (pricing_model IN ('commission', 'subscription')),
    activity_domain TEXT,
    brief_description TEXT,
    submitted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index de performance Modération
CREATE INDEX IF NOT EXISTS idx_verification_requests_tenant ON public.verification_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_type ON public.verification_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_verification_requests_created ON public.verification_requests(created_at DESC);

-- Sécurité RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verification_requests_select" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_insert" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_update" ON public.verification_requests;

CREATE POLICY "verification_requests_select" ON public.verification_requests
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

CREATE POLICY "verification_requests_insert" ON public.verification_requests
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

CREATE POLICY "verification_requests_update" ON public.verification_requests
    FOR UPDATE USING (
        auth.role() = 'authenticated'
    );


-- ==============================================================================
-- MODULE C : STOCK & POS (Traçabilité des Entrées/Sorties en Temps Réel)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('SALE_POS', 'STOCK_IN', 'STOCK_OUT', 'INVENTORY_AUDIT', 'RETURN', 'DAMAGE_LOSS', 'TRANSFER')),
    quantity_change NUMERIC(12, 3) NOT NULL,
    quantity_before NUMERIC(12, 3) NOT NULL,
    quantity_after NUMERIC(12, 3) NOT NULL,
    unit_price NUMERIC(14, 2),
    unit_cost NUMERIC(14, 2),
    reference_sale_id TEXT,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    operator_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index de performance Stock
CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant ON public.inventory_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_sale ON public.inventory_movements(reference_sale_id) WHERE reference_sale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements(created_at DESC);

-- Sécurité RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_movements_select" ON public.inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_insert" ON public.inventory_movements;

CREATE POLICY "inventory_movements_select" ON public.inventory_movements
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

CREATE POLICY "inventory_movements_insert" ON public.inventory_movements
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

-- ==============================================================================
-- TRIGGER AUTOMATIQUE POUR updated_at
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_campaigns_updated_at ON public.email_campaigns;
CREATE TRIGGER trg_email_campaigns_updated_at
    BEFORE UPDATE ON public.email_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at_column();

DROP TRIGGER IF EXISTS trg_verification_requests_updated_at ON public.verification_requests;
CREATE TRIGGER trg_verification_requests_updated_at
    BEFORE UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at_column();
