-- ==============================================================================
-- MIGRATION SUPABASE : Toggle Éditeur d'Affiliation & Routage Whitelabel vs Super Admin
-- Date : 2026-11-06
-- ==============================================================================

-- 1. Ajout des colonnes d'affiliation dans courses, products, funnels
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'is_affiliate_enabled') THEN
        ALTER TABLE public.courses ADD COLUMN is_affiliate_enabled BOOLEAN NOT NULL DEFAULT true;
        ALTER TABLE public.courses ADD COLUMN affiliate_commission_rate NUMERIC(5, 2) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_affiliate_enabled') THEN
        ALTER TABLE public.products ADD COLUMN is_affiliate_enabled BOOLEAN NOT NULL DEFAULT true;
        ALTER TABLE public.products ADD COLUMN affiliate_commission_rate NUMERIC(5, 2) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'funnels' AND column_name = 'is_affiliate_enabled') THEN
        ALTER TABLE public.funnels ADD COLUMN is_affiliate_enabled BOOLEAN NOT NULL DEFAULT true;
        ALTER TABLE public.funnels ADD COLUMN affiliate_commission_rate NUMERIC(5, 2) DEFAULT NULL;
    END IF;
END $$;

-- 2. Mise à jour de public.tenant_affiliates pour le routage de validation
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenant_affiliates' AND column_name = 'routing_type') THEN
        ALTER TABLE public.tenant_affiliates ADD COLUMN routing_type TEXT NOT NULL DEFAULT 'custom' CHECK (routing_type IN ('standard', 'custom'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenant_affiliates' AND column_name = 'validation_target') THEN
        ALTER TABLE public.tenant_affiliates ADD COLUMN validation_target TEXT NOT NULL DEFAULT 'tenant' CHECK (validation_target IN ('tenant', 'super_admin'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenant_affiliates' AND column_name = 'requested_item_title') THEN
        ALTER TABLE public.tenant_affiliates ADD COLUMN requested_item_title TEXT NULL;
        ALTER TABLE public.tenant_affiliates ADD COLUMN requested_item_type TEXT NULL;
        ALTER TABLE public.tenant_affiliates ADD COLUMN requested_item_id UUID NULL;
    END IF;
END $$;

-- 3. Table public.tenant_affiliate_products (Liste des produits/cours sélectionnés par un affilié)
CREATE TABLE IF NOT EXISTS public.tenant_affiliate_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    affiliate_id UUID NOT NULL REFERENCES public.tenant_affiliates(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('course', 'product', 'webinar', 'live_shopping', 'funnel')),
    item_id UUID NOT NULL,
    item_title TEXT NOT NULL,
    commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_affiliate_item UNIQUE (affiliate_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_affiliate ON public.tenant_affiliate_products(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_tenant ON public.tenant_affiliate_products(tenant_id);

-- 4. Fonction RPC pour souscrire / ajouter un produit à la liste d'un affilié
CREATE OR REPLACE FUNCTION public.request_item_affiliation(
    p_tenant_id UUID,
    p_item_type TEXT,
    p_item_id UUID,
    p_item_title TEXT,
    p_affiliate_code TEXT,
    p_is_new_applicant BOOLEAN,
    p_applicant_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant RECORD;
    v_affiliate RECORD;
    v_target TEXT;
    v_initial_status tenant_affiliate_status;
    v_rate NUMERIC(5, 2);
    v_clean_code TEXT;
BEGIN
    -- Recherche du tenant
    SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id;
    IF v_tenant.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tenant introuvable');
    END IF;

    -- Règle de routage demandée par le client :
    -- Si tenant standard -> validation envoyée au dashboard Super Admin
    -- Si tenant custom whitelabel -> validation envoyée directement au tenant
    IF v_tenant.routing_type = 'standard' THEN
        v_target := 'super_admin';
        v_initial_status := 'pending'; -- En attente de validation du Super Admin
    ELSE
        v_target := 'tenant';
        v_initial_status := 'approved'; -- Directement approuvé ou transmis au tenant custom
    END IF;

    v_clean_code := UPPER(TRIM(p_affiliate_code));
    v_rate := COALESCE(v_tenant.tenant_affiliate_default_rate, 15.00);

    -- CAS 1 : Nouvel affilié qui s'inscrit au clic sur le badge
    IF p_is_new_applicant = TRUE THEN
        INSERT INTO public.tenant_affiliates (
            tenant_id,
            full_name,
            email,
            whatsapp_number,
            affiliate_code,
            custom_commission_rate,
            status,
            routing_type,
            validation_target,
            payout_channel,
            payout_account_details,
            requested_item_title,
            requested_item_type,
            requested_item_id
        ) VALUES (
            p_tenant_id,
            COALESCE(p_applicant_data->>'full_name', 'Affilié Inconnu'),
            LOWER(TRIM(COALESCE(p_applicant_data->>'email', ''))),
            COALESCE(p_applicant_data->>'whatsapp_number', ''),
            v_clean_code,
            v_rate,
            v_initial_status,
            v_tenant.routing_type::TEXT,
            v_target,
            COALESCE(p_applicant_data->>'payout_channel', 'Wave / Orange Money'),
            COALESCE(p_applicant_data->>'payout_account_details', ''),
            p_item_title,
            p_item_type,
            p_item_id
        )
        RETURNING * INTO v_affiliate;
    ELSE
        -- CAS 2 : Affilié déjà existant qui ajoute ce produit à sa liste
        SELECT * INTO v_affiliate
        FROM public.tenant_affiliates
        WHERE tenant_id = p_tenant_id
          AND LOWER(affiliate_code) = LOWER(v_clean_code)
        LIMIT 1;

        IF v_affiliate.id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Code affilié introuvable pour cette boutique.');
        END IF;
    END IF;

    -- Ajout du produit dans la liste de vente de l'affilié
    INSERT INTO public.tenant_affiliate_products (
        tenant_id,
        affiliate_id,
        item_type,
        item_id,
        item_title,
        commission_rate
    ) VALUES (
        p_tenant_id,
        v_affiliate.id,
        p_item_type,
        p_item_id,
        p_item_title,
        COALESCE(v_affiliate.custom_commission_rate, v_rate)
    )
    ON CONFLICT (affiliate_id, item_type, item_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'affiliate_id', v_affiliate.id,
        'affiliate_code', v_affiliate.affiliate_code,
        'validation_target', v_target,
        'status', v_affiliate.status,
        'tenant_routing_type', v_tenant.routing_type,
        'tenant_name', v_tenant.name,
        'item_title', p_item_title,
        'commission_rate', COALESCE(v_affiliate.custom_commission_rate, v_rate)
    );
END;
$$;
