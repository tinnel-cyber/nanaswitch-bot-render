-- ==============================================================================
-- MIGRATION SUPABASE : Système d'Affiliation & Partenaires Automatisé
-- Badge "Propulsé par Nanasore" -> Parrainage -> Commissions sur Abonnements & Modules
-- Date : 2026-11-06
-- ==============================================================================

-- 1. Ajout des colonnes d'affiliation sur public.tenants
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'referred_by_tenant_id') THEN
        ALTER TABLE public.tenants ADD COLUMN referred_by_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_tenants_referred_by ON public.tenants (referred_by_tenant_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'affiliate_commission_rate') THEN
        ALTER TABLE public.tenants ADD COLUMN affiliate_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00 CHECK (affiliate_commission_rate >= 0.00 AND affiliate_commission_rate <= 100.00);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'referred_by_tenant_id') THEN
        ALTER TABLE public.profiles ADD COLUMN referred_by_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles (referred_by_tenant_id);
    END IF;
END $$;

-- 2. Table public.affiliate_referrals (Liaison Parent/Enfant Parrainage)
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    referred_tenant_id UUID UNIQUE NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    total_commission_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_commission_earned >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked')),
    attribution_source TEXT NOT NULL DEFAULT 'whitelabel_footer_badge',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referrer ON public.affiliate_referrals(referrer_tenant_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred ON public.affiliate_referrals(referred_tenant_id);

-- 3. Table public.affiliate_commission_logs (Historique et Audit Financier des Gains)
CREATE TABLE IF NOT EXISTS public.affiliate_commission_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    referred_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('SUBSCRIPTION_PAYMENT', 'MODULE_PURCHASE', 'PLAN_RENEWAL')),
    gross_amount NUMERIC(12, 2) NOT NULL CHECK (gross_amount > 0),
    commission_rate NUMERIC(5, 2) NOT NULL,
    commission_amount NUMERIC(12, 2) NOT NULL CHECK (commission_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'XOF',
    description TEXT NOT NULL,
    payout_status TEXT NOT NULL DEFAULT 'credited_to_wallet' CHECK (payout_status IN ('credited_to_wallet', 'pending_approval', 'withdrawn')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_logs_referrer ON public.affiliate_commission_logs(referrer_tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_logs_referred ON public.affiliate_commission_logs(referred_tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_logs_created_at ON public.affiliate_commission_logs(created_at DESC);

-- 4. Fonction RPC PostgreSQL : Attribution automatique d'un nouveau tenant parrainé
CREATE OR REPLACE FUNCTION public.register_tenant_referral(
    p_referred_tenant_id UUID,
    p_referrer_identifier TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referrer RECORD;
    v_clean_ref TEXT;
BEGIN
    v_clean_ref := LOWER(TRIM(p_referrer_identifier));

    -- Recherche du tenant parrain par slug ou ID
    SELECT * INTO v_referrer
    FROM public.tenants
    WHERE LOWER(slug) = v_clean_ref OR id::TEXT = v_clean_ref
    LIMIT 1;

    IF v_referrer.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Parrain introuvable');
    END IF;

    -- Éviter l'auto-parrainage
    IF v_referrer.id = p_referred_tenant_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Auto-parrainage impossible');
    END IF;

    -- Mise à jour du tenant filleul
    UPDATE public.tenants
    SET referred_by_tenant_id = v_referrer.id
    WHERE id = p_referred_tenant_id;

    -- Enregistrement ou mise à jour dans affiliate_referrals
    INSERT INTO public.affiliate_referrals (
        referrer_tenant_id,
        referred_tenant_id,
        commission_rate,
        status,
        attribution_source
    ) VALUES (
        v_referrer.id,
        p_referred_tenant_id,
        COALESCE(v_referrer.affiliate_commission_rate, 20.00),
        'active',
        'whitelabel_footer_badge'
    )
    ON CONFLICT (referred_tenant_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'referrer_id', v_referrer.id,
        'referrer_name', v_referrer.name,
        'commission_rate', COALESCE(v_referrer.affiliate_commission_rate, 20.00)
    );
END;
$$;

-- 5. Fonction RPC PostgreSQL : Rémunération automatique sur achat / abonnement
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
    v_commission_amount NUMERIC(12, 2);
    v_wallet_id UUID;
    v_rate NUMERIC(5, 2);
BEGIN
    -- 1. Récupération de la liaison d'affiliation
    SELECT * INTO v_referral
    FROM public.affiliate_referrals
    WHERE referred_tenant_id = p_referred_tenant_id
      AND status = 'active'
    LIMIT 1;

    -- Repli sur la colonne direct referred_by_tenant_id si non présent dans la table
    IF v_referral.referrer_tenant_id IS NULL THEN
        SELECT referred_by_tenant_id INTO v_referral.referrer_tenant_id
        FROM public.tenants
        WHERE id = p_referred_tenant_id;

        IF v_referral.referrer_tenant_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Aucun parrain affilié pour ce tenant');
        END IF;

        v_rate := 20.00;
    ELSE
        v_rate := COALESCE(v_referral.commission_rate, 20.00);
    END IF;

    -- Récupération des infos du tenant parrain
    SELECT * INTO v_referrer
    FROM public.tenants
    WHERE id = v_referral.referrer_tenant_id;

    IF v_referrer.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tenant parrain inexistant');
    END IF;

    -- 2. Calcul du montant de la commission
    v_commission_amount := ROUND((p_gross_amount * (v_rate / 100.0)), 2);

    IF v_commission_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Montant de commission nul');
    END IF;

    -- 3. Crédit du Wallet du parrain (Portefeuille de gains Nanasore)
    -- Crée le wallet s'il n'existe pas encore pour ce tenant
    INSERT INTO public.wallets (tenant_id, cash_balance, credit_balance, currency)
    VALUES (v_referrer.id::TEXT, v_commission_amount, 0.00, 'XOF')
    ON CONFLICT (tenant_id) DO UPDATE
    SET 
        cash_balance = public.wallets.cash_balance + v_commission_amount,
        updated_at = NOW()
    RETURNING id INTO v_wallet_id;

    -- 4. Écriture dans l'historique financier wallet_transactions
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
        FORMAT('%s (Affiliation %s%% sur %s XOF - %s)', p_description, v_rate, p_gross_amount, v_referrer.name)
    );

    -- 5. Audit dans les logs d'affiliation
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
        p_description,
        'credited_to_wallet'
    );

    -- 6. Mise à jour du cumul des gains
    UPDATE public.affiliate_referrals
    SET 
        total_commission_earned = total_commission_earned + v_commission_amount,
        updated_at = NOW()
    WHERE referred_tenant_id = p_referred_tenant_id;

    RETURN jsonb_build_object(
        'success', true,
        'referrer_id', v_referrer.id,
        'referrer_name', v_referrer.name,
        'gross_amount', p_gross_amount,
        'commission_rate', v_rate,
        'commission_amount', v_commission_amount,
        'wallet_id', v_wallet_id
    );
END;
$$;
