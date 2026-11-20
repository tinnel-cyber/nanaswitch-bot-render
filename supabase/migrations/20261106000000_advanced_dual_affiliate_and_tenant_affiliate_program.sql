-- ==============================================================================
-- MIGRATION SUPABASE : DOUBLE SYSTÈME D'AFFILIATION COMPLET NANASORE
-- 1. Affiliation Plateforme Nanasore :
--    - Plan Partenaire (15% à vie, évolutif selon volume de filleuls)
--    - Plan Affilié (40% One-shot en paiement unique sur le premier achat)
-- 2. Affiliation du Tenant (Marchands & Formateurs) :
--    - Formulaire de souscription dédié pour devenir affilié du tenant
--    - Vente de cours, produits, webinaires, live shopping avec commission propre au tenant
-- Date : 2026-11-06
-- ==============================================================================

-- 1. Types Énumérés (ENUM)
DO $$ BEGIN
    CREATE TYPE nanasore_affiliate_type AS ENUM ('PARTNER_LIFETIME', 'AFFILIATE_ONESHOT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tenant_affiliate_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Mise à jour de la table public.tenants pour les deux niveaux d'affiliation
DO $$ BEGIN
    -- Type d'affiliation plateforme choisi par le parrain (Partenaire à vie vs Affilié One-shot)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'platform_affiliate_type') THEN
        ALTER TABLE public.tenants ADD COLUMN platform_affiliate_type nanasore_affiliate_type NOT NULL DEFAULT 'PARTNER_LIFETIME';
    END IF;

    -- Activation du module "Affiliation du Tenant" pour ses propres produits/cours
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'has_tenant_affiliate_program') THEN
        ALTER TABLE public.tenants ADD COLUMN has_tenant_affiliate_program BOOLEAN NOT NULL DEFAULT true;
    END IF;

    -- Taux de commission par défaut offert par le tenant à ses propres affiliés (ex: 15.00%)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'tenant_affiliate_default_rate') THEN
        ALTER TABLE public.tenants ADD COLUMN tenant_affiliate_default_rate NUMERIC(5, 2) NOT NULL DEFAULT 15.00 CHECK (tenant_affiliate_default_rate >= 0.00 AND tenant_affiliate_default_rate <= 90.00);
    END IF;

    -- Conditions et texte du programme d'affiliation du tenant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'tenant_affiliate_terms') THEN
        ALTER TABLE public.tenants ADD COLUMN tenant_affiliate_terms TEXT DEFAULT 'Rejoignez notre programme d''ambassadeurs et touchez une commission sur chaque vente réalisée via votre lien personnel.';
    END IF;

    -- Approbation automatique ou manuelle des postulants affiliés du tenant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'tenant_affiliate_auto_approve') THEN
        ALTER TABLE public.tenants ADD COLUMN tenant_affiliate_auto_approve BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- 3. Mise à jour de public.affiliate_referrals pour le suivi One-Shot vs À vie
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'affiliate_referrals' AND column_name = 'program_type') THEN
        ALTER TABLE public.affiliate_referrals ADD COLUMN program_type nanasore_affiliate_type NOT NULL DEFAULT 'PARTNER_LIFETIME';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'affiliate_referrals' AND column_name = 'is_oneshot_paid') THEN
        ALTER TABLE public.affiliate_referrals ADD COLUMN is_oneshot_paid BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 4. Table public.tenant_affiliates : Inscription des affiliés propres à un Marchand / Formateur
CREATE TABLE IF NOT EXISTS public.tenant_affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    affiliate_code TEXT NOT NULL,
    custom_commission_rate NUMERIC(5, 2) NULL CHECK (custom_commission_rate IS NULL OR (custom_commission_rate >= 0 AND custom_commission_rate <= 90)),
    status tenant_affiliate_status NOT NULL DEFAULT 'approved',
    payout_channel TEXT NOT NULL DEFAULT 'Wave / Orange Money',
    payout_account_details TEXT NOT NULL DEFAULT '',
    total_sales_count INTEGER NOT NULL DEFAULT 0,
    total_sales_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_sales_amount >= 0),
    total_commissions_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_commissions_earned >= 0),
    total_commissions_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_commissions_paid >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_affiliate_code UNIQUE (tenant_id, affiliate_code),
    CONSTRAINT uq_tenant_affiliate_email UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_tenant_affiliates_tenant_id ON public.tenant_affiliates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_affiliates_code ON public.tenant_affiliates (tenant_id, LOWER(affiliate_code));
CREATE INDEX IF NOT EXISTS idx_tenant_affiliates_status ON public.tenant_affiliates (status);

-- 5. Table public.tenant_affiliate_sales : Suivi de chaque vente de cours, produit ou live apportée par l'affilié
CREATE TABLE IF NOT EXISTS public.tenant_affiliate_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    affiliate_id UUID NOT NULL REFERENCES public.tenant_affiliates(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('course', 'product', 'webinar', 'live_shopping', 'funnel')),
    item_id UUID NULL,
    item_title TEXT NOT NULL,
    buyer_email TEXT NULL,
    sale_amount NUMERIC(12, 2) NOT NULL CHECK (sale_amount >= 0),
    commission_rate NUMERIC(5, 2) NOT NULL,
    commission_amount NUMERIC(12, 2) NOT NULL CHECK (commission_amount >= 0),
    payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'approved', 'paid', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_affiliate_sales_tenant ON public.tenant_affiliate_sales (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_affiliate_sales_affiliate ON public.tenant_affiliate_sales (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_tenant_affiliate_sales_created ON public.tenant_affiliate_sales (created_at DESC);

-- 6. Fonction de calcul dynamique du taux Plan Partenaire Nanasore (15% de base, progressif)
-- 0 à 4 partenaires actifs -> 15%
-- 5 à 14 partenaires actifs -> 20%
-- 15 à 29 partenaires actifs -> 25%
-- 30+ partenaires actifs -> 30%
CREATE OR REPLACE FUNCTION public.get_partner_dynamic_rate(p_referrer_tenant_id UUID)
RETURNS NUMERIC(5, 2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_referrals INT := 0;
BEGIN
    SELECT COUNT(*) INTO v_active_referrals
    FROM public.affiliate_referrals
    WHERE referrer_tenant_id = p_referrer_tenant_id
      AND status = 'active';

    IF v_active_referrals >= 30 THEN
        RETURN 30.00;
    ELSIF v_active_referrals >= 15 THEN
        RETURN 25.00;
    ELSIF v_active_referrals >= 5 THEN
        RETURN 20.00;
    ELSE
        RETURN 15.00; -- Taux de base Plan Partenaire
    END IF;
END;
$$;

-- 7. Procédure révisée : Attribution et Rémunération Plateforme Nanasore (15% à vie vs 40% One-shot)
CREATE OR REPLACE FUNCTION public.process_affiliate_commission(
    p_referred_tenant_id UUID,
    p_gross_amount NUMERIC(12, 2),
    p_event_type TEXT,
    p_description TEXT DEFAULT 'Commission d''affiliation Nanasore'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referral RECORD;
    v_referrer RECORD;
    v_program_type nanasore_affiliate_type;
    v_commission_amount NUMERIC(12, 2);
    v_wallet_id UUID;
    v_rate NUMERIC(5, 2);
BEGIN
    -- 1. Récupération de la relation de parrainage
    SELECT * INTO v_referral
    FROM public.affiliate_referrals
    WHERE referred_tenant_id = p_referred_tenant_id
      AND status = 'active'
    LIMIT 1;

    IF v_referral.referrer_tenant_id IS NULL THEN
        -- Repli sur referred_by_tenant_id direct sur la table tenants
        SELECT referred_by_tenant_id INTO v_referral.referrer_tenant_id
        FROM public.tenants
        WHERE id = p_referred_tenant_id;

        IF v_referral.referrer_tenant_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Aucun parrain affilié pour ce tenant');
        END IF;

        v_program_type := 'PARTNER_LIFETIME';
    ELSE
        v_program_type := COALESCE(v_referral.program_type, 'PARTNER_LIFETIME');
    END IF;

    -- Récupération du profil du parrain
    SELECT * INTO v_referrer
    FROM public.tenants
    WHERE id = v_referral.referrer_tenant_id;

    IF v_referrer.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tenant parrain introuvable');
    END IF;

    -- Si le parrain est configuré sur une préférence spécifique
    IF v_referrer.platform_affiliate_type IS NOT NULL THEN
        v_program_type := v_referrer.platform_affiliate_type;
    END IF;

    -- 2. Traitement selon le modèle choisi : Plan Affilié (40% One-shot) vs Plan Partenaire (15% à vie)
    IF v_program_type = 'AFFILIATE_ONESHOT' THEN
        -- S'il a déjà perçu sa prime unique One-Shot de 40%, plus aucune commission n'est due
        IF v_referral.is_oneshot_paid = TRUE THEN
            RETURN jsonb_build_object(
                'success', true,
                'message', 'Prime One-Shot (40%) déjà versée pour ce filleul. Aucune commission récurrente.',
                'oneshot_already_paid', true
            );
        END IF;

        v_rate := 40.00; -- Taux unique de 40%
    ELSE
        -- Plan Partenaire : 15% de base, progressif à vie selon le nombre de filleuls
        v_rate := public.get_partner_dynamic_rate(v_referrer.id);
    END IF;

    -- 3. Calcul de la commission
    v_commission_amount := ROUND((p_gross_amount * (v_rate / 100.0)), 2);

    IF v_commission_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Montant de commission nul');
    END IF;

    -- 4. Crédit immédiat sur le portefeuille (public.wallets) du tenant parrain
    INSERT INTO public.wallets (tenant_id, cash_balance, credit_balance, currency)
    VALUES (v_referrer.id::TEXT, v_commission_amount, 0.00, 'XOF')
    ON CONFLICT (tenant_id) DO UPDATE
    SET 
        cash_balance = public.wallets.cash_balance + v_commission_amount,
        updated_at = NOW()
    RETURNING id INTO v_wallet_id;

    -- 5. Journalisation financière immuable
    INSERT INTO public.wallet_transactions (
        wallet_id,
        transaction_type,
        amount,
        reference_id,
        description
    ) VALUES (
        v_wallet_id,
        'COMMISSION_FEE',
        v_commission_amount,
        p_referred_tenant_id::TEXT,
        FORMAT('%s [%s : %s%% sur %s XOF]', p_description, v_program_type, v_rate, p_gross_amount)
    );

    -- 6. Log d'audit dans affiliate_commission_logs
    INSERT INTO public.affiliate_commission_logs (
        referrer_tenant_id,
        referred_tenant_id,
        event_type,
        gross_amount,
        commission_rate,
        commission_amount,
        description,
        payout_status
    ) VALUES (
        v_referrer.id,
        p_referred_tenant_id,
        p_event_type,
        p_gross_amount,
        v_rate,
        v_commission_amount,
        FORMAT('%s (%s)', p_description, v_program_type),
        'credited_to_wallet'
    );

    -- 7. Mise à jour de l'enregistrement de parrainage
    UPDATE public.affiliate_referrals
    SET 
        total_commission_earned = total_commission_earned + v_commission_amount,
        is_oneshot_paid = CASE WHEN v_program_type = 'AFFILIATE_ONESHOT' THEN true ELSE is_oneshot_paid END,
        updated_at = NOW()
    WHERE referred_tenant_id = p_referred_tenant_id;

    RETURN jsonb_build_object(
        'success', true,
        'program_type', v_program_type,
        'commission_rate', v_rate,
        'commission_amount', v_commission_amount,
        'referrer_id', v_referrer.id,
        'referrer_name', v_referrer.name,
        'wallet_id', v_wallet_id
    );
END;
$$;

-- 8. Procédure pour enregistrer une vente via un "Affilié du Tenant" (Cours, Produits, Webinaires)
CREATE OR REPLACE FUNCTION public.record_tenant_affiliate_sale(
    p_tenant_id UUID,
    p_affiliate_code TEXT,
    p_item_type TEXT,
    p_item_title TEXT,
    p_sale_amount NUMERIC(12, 2),
    p_buyer_email TEXT DEFAULT NULL,
    p_item_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_affiliate RECORD;
    v_tenant RECORD;
    v_rate NUMERIC(5, 2);
    v_commission NUMERIC(12, 2);
BEGIN
    -- Recherche du tenant
    SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id;
    IF v_tenant.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tenant introuvable');
    END IF;

    -- Recherche de l'affilié par son code auprès de ce tenant
    SELECT * INTO v_affiliate 
    FROM public.tenant_affiliates 
    WHERE tenant_id = p_tenant_id 
      AND LOWER(affiliate_code) = LOWER(TRIM(p_affiliate_code))
      AND status = 'approved'
    LIMIT 1;

    IF v_affiliate.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Affilié introuvable ou non approuvé pour ce tenant');
    END IF;

    -- Détermination du taux : commission spécifique de l'affilié ou taux par défaut du tenant
    v_rate := COALESCE(v_affiliate.custom_commission_rate, v_tenant.tenant_affiliate_default_rate, 15.00);
    v_commission := ROUND((p_sale_amount * (v_rate / 100.0)), 2);

    -- Enregistrement de la vente
    INSERT INTO public.tenant_affiliate_sales (
        tenant_id,
        affiliate_id,
        item_type,
        item_id,
        item_title,
        buyer_email,
        sale_amount,
        commission_rate,
        commission_amount,
        payout_status
    ) VALUES (
        p_tenant_id,
        v_affiliate.id,
        p_item_type,
        p_item_id,
        p_item_title,
        p_buyer_email,
        p_sale_amount,
        v_rate,
        v_commission,
        'approved'
    );

    -- Mise à jour du cumul de l'affilié
    UPDATE public.tenant_affiliates
    SET 
        total_sales_count = total_sales_count + 1,
        total_sales_amount = total_sales_amount + p_sale_amount,
        total_commissions_earned = total_commissions_earned + v_commission,
        updated_at = NOW()
    WHERE id = v_affiliate.id;

    RETURN jsonb_build_object(
        'success', true,
        'affiliate_id', v_affiliate.id,
        'affiliate_name', v_affiliate.full_name,
        'affiliate_code', v_affiliate.affiliate_code,
        'sale_amount', p_sale_amount,
        'commission_rate', v_rate,
        'commission_amount', v_commission
    );
END;
$$;
