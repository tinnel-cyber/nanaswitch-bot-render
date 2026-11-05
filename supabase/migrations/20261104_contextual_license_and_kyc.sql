-- =======================================================================
-- MIGRATION SUPABASE : Licence Contextuelle, Contrôle d'Accès aux Modules & KYC
-- Date : 2026-11-04
-- =======================================================================

-- 1. Table profiles avec champs de licence contextuelle
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    full_name TEXT,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'user',
    wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0.00),
    kyc_status TEXT NOT NULL DEFAULT 'none' CHECK (kyc_status IN ('none', 'light', 'full')),
    pricing_model TEXT NOT NULL DEFAULT 'pay_per_use' CHECK (pricing_model IN ('pay_per_use', 'commission', 'subscription')),
    enabled_themes JSONB NOT NULL DEFAULT '["theme-default", "theme-electro-tech"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Si la table profiles existe déjà, ajouter les colonnes nécessaires de manière idempotente
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'wallet_balance') THEN
        ALTER TABLE public.profiles ADD COLUMN wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0.00);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'kyc_status') THEN
        ALTER TABLE public.profiles ADD COLUMN kyc_status TEXT NOT NULL DEFAULT 'none' CHECK (kyc_status IN ('none', 'light', 'full'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'pricing_model') THEN
        ALTER TABLE public.profiles ADD COLUMN pricing_model TEXT NOT NULL DEFAULT 'pay_per_use' CHECK (pricing_model IN ('pay_per_use', 'commission', 'subscription'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'enabled_themes') THEN
        ALTER TABLE public.profiles ADD COLUMN enabled_themes JSONB NOT NULL DEFAULT '["theme-default"]'::jsonb;
    END IF;
END $$;

-- 2. Table account_activations (Tunnels d'ouverture de compte, vérifications KYC et états des licences)
CREATE TABLE IF NOT EXISTS public.account_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    pricing_model TEXT NOT NULL CHECK (pricing_model IN ('pay_per_use', 'commission', 'subscription')),
    subscription_option TEXT CHECK (subscription_option IS NULL OR subscription_option IN ('training', 'caisse_vitrine', 'all_inclusive')),
    kyc_status TEXT NOT NULL DEFAULT 'none' CHECK (kyc_status IN ('none', 'light', 'full')),
    wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0.00),
    enabled_themes JSONB NOT NULL DEFAULT '["theme-default"]'::jsonb,
    enabled_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    read_only_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    injected_carte_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    kyc_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'active')),
    admin_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON public.profiles(wallet_balance);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON public.profiles(kyc_status);
CREATE INDEX IF NOT EXISTS idx_profiles_pricing_model ON public.profiles(pricing_model);
CREATE INDEX IF NOT EXISTS idx_account_activations_user ON public.account_activations(user_id);
CREATE INDEX IF NOT EXISTS idx_account_activations_status ON public.account_activations(status);
CREATE INDEX IF NOT EXISTS idx_account_activations_pricing ON public.account_activations(pricing_model);

-- 3. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_activations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_policy ON public.profiles;
CREATE POLICY profiles_policy ON public.profiles
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS account_activations_policy ON public.account_activations;
CREATE POLICY account_activations_policy ON public.account_activations
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- =======================================================================
-- 4. FONCTION STOCKÉE : Consommation de portefeuille sans KYC (Paiement à l'usage)
-- Modules éligibles : 'cvpro', 'nanagenerator', 'docusign'
-- =======================================================================
CREATE OR REPLACE FUNCTION public.deduct_wallet_usage(
    p_user_id UUID,
    p_amount NUMERIC(12, 2),
    p_module_key TEXT,
    p_description TEXT DEFAULT 'Consommation de module paiement à l''usage'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance NUMERIC(12, 2);
    v_new_balance NUMERIC(12, 2);
    v_profile_exists BOOLEAN;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le montant à déduire doit être supérieur à zéro');
    END IF;

    -- Vérification du solde dans profiles
    SELECT wallet_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Si le profil n'existe pas encore, on le crée avec solde 0
        INSERT INTO public.profiles (id, wallet_balance, kyc_status, pricing_model)
        VALUES (p_user_id, 0.00, 'none', 'pay_per_use')
        RETURNING wallet_balance INTO v_current_balance;
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Solde de portefeuille insuffisant',
            'current_balance', v_current_balance,
            'required_amount', p_amount
        );
    END IF;

    v_new_balance := v_current_balance - p_amount;

    UPDATE public.profiles
    SET wallet_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Synchronisation avec account_activations si existant
    UPDATE public.account_activations
    SET wallet_balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Traces dans wallet_transactions si table existante
    BEGIN
        INSERT INTO public.wallet_transactions (
            wallet_id,
            transaction_type,
            amount,
            description,
            reference_id
        )
        SELECT 
            w.id,
            'USAGE_DEDUCTION'::wallet_transaction_type,
            p_amount,
            p_description || ' (Module: ' || p_module_key || ')',
            p_user_id::text
        FROM public.wallets w
        WHERE w.tenant_id = p_user_id::text;
    EXCEPTION WHEN OTHERS THEN
        -- Table wallets optionnelle
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Paiement à l''usage validé sans KYC',
        'previous_balance', v_current_balance,
        'deducted_amount', p_amount,
        'new_balance', v_new_balance,
        'module_key', p_module_key
    );
END;
$$;

-- =======================================================================
-- 5. FONCTION STOCKÉE : Soumission Tunnel d'Ouverture de Compte & KYC
-- Gère les branches Commission et Abonnement
-- =======================================================================
CREATE OR REPLACE FUNCTION public.submit_account_activation(
    p_user_id UUID,
    p_pricing_model TEXT,
    p_subscription_option TEXT DEFAULT NULL,
    p_kyc_data JSONB DEFAULT '{}'::jsonb,
    p_org_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_kyc_status TEXT := 'none';
    v_enabled_themes JSONB;
    v_enabled_modules JSONB;
    v_read_only_modules JSONB;
    v_activation_id UUID;
    v_profile_balance NUMERIC(12, 2) := 0.00;
BEGIN
    -- Récupérer le solde actuel du portefeuille s'il existe
    SELECT wallet_balance INTO v_profile_balance
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_profile_balance IS NULL THEN
        v_profile_balance := 0.00;
    END IF;

    -- ===================================================================
    -- A. BRANCHE COMMISSION (Pay-as-you-go) : KYC Léger sans RCCM
    -- Active uniquement Thème Digital Pro et Thème Live Webinaire.
    -- Verrouille les thèmes d'E-commerce physique.
    -- ===================================================================
    IF p_pricing_model = 'commission' THEN
        v_kyc_status := 'light';
        -- Thèmes autorisés pour Commission
        v_enabled_themes := jsonb_build_array('theme-digital-pro', 'theme-livestream-pro');

        -- Modules métiers activés en écriture
        v_enabled_modules := jsonb_build_array(
            'cvpro', 'nanagenerator', 'docusign', 
            'theme-builder', 'webinar', 'cours-forge', 'course-create', 'academy-support', 'wameet'
        );
        -- Modules physiques en lecture seule (read_only)
        v_read_only_modules := jsonb_build_array(
            'pos', 'studio', 'inventory', 'scanner', 'debts'
        );

    -- ===================================================================
    -- B. BRANCHE ABONNEMENT : KYC Entreprise (Exige RCCM et docs légaux)
    -- ===================================================================
    ELSIF p_pricing_model = 'subscription' THEN
        v_kyc_status := 'full';

        -- Option 1 : Formation
        -- Désactive la caisse physique et la vitrine physique
        IF p_subscription_option = 'training' THEN
            v_enabled_themes := jsonb_build_array('theme-digital-pro', 'theme-livestream-pro');
            v_enabled_modules := jsonb_build_array(
                'cvpro', 'nanagenerator', 'docusign',
                'cours-forge', 'course-create', 'academy-support', 'wameet', 'webinar', 'nanamarket'
            );
            v_read_only_modules := jsonb_build_array(
                'pos', 'scanner', 'studio', 'inventory', 'debts'
            );

        -- Option 2 : Caisse & Vitrine
        -- Active la caisse physique, les vitrines physiques et le Thème Live Shopping / Webinaire.
        -- Verrouille le Thème Digital Pro.
        ELSIF p_subscription_option = 'caisse_vitrine' THEN
            v_enabled_themes := jsonb_build_array(
                'theme-default', 'theme-electro-tech', 'theme-electro-orange', 
                'theme-beauty-emerald', 'theme-megastore-pro', 'theme-blank-custom',
                'theme-livestream-pro'
            );
            v_enabled_modules := jsonb_build_array(
                'pos', 'studio', 'inventory', 'scanner', 'debts', 'analytics', 'team-employees',
                'webinar', 'cvpro', 'nanagenerator', 'docusign', 'excel'
            );
            v_read_only_modules := jsonb_build_array(
                'cours-forge', 'course-create', 'academy-support'
            );

        -- Option Par Défaut : Tout inclus
        ELSE
            v_enabled_themes := jsonb_build_array(
                'theme-default', 'theme-digital-pro', 'theme-livestream-pro',
                'theme-electro-tech', 'theme-electro-orange', 'theme-beauty-emerald', 'theme-megastore-pro', 'theme-blank-custom'
            );
            v_enabled_modules := jsonb_build_array(
                'pos', 'studio', 'inventory', 'scanner', 'debts', 'analytics', 'team-employees',
                'webinar', 'cours-forge', 'course-create', 'academy-support', 'cvpro', 'nanagenerator', 'docusign'
            );
            v_read_only_modules := jsonb_build_array();
        END IF;

    -- ===================================================================
    -- C. BRANCHE ACCÈS GÉNÉRAL SANS KYC (Pay-per-use / Gratuit)
    -- ===================================================================
    ELSE
        p_pricing_model := 'pay_per_use';
        v_kyc_status := 'none';
        -- Offre Gratuite : Accès à deux thèmes (Élite Default et Electro Pro)
        v_enabled_themes := jsonb_build_array('theme-default', 'theme-electro-tech');
        v_enabled_modules := jsonb_build_array('cvpro', 'nanagenerator', 'docusign', 'nanamarket', 'scanner', 'nana-switch', 'academic-upload');
        -- Pas de theme-builder en écriture : passe en lecture seule / aperçu
        v_read_only_modules := jsonb_build_array(
            'theme-builder', 'pos', 'studio', 'inventory', 'debts', 'team-employees', 'analytics', 
            'cours-forge', 'course-create', 'webinar', 'ultimate-funnel', 'modular-funnel'
        );
    END IF;

    -- Insertion de la demande d'activation de compte
    INSERT INTO public.account_activations (
        user_id,
        organization_id,
        pricing_model,
        subscription_option,
        kyc_status,
        wallet_balance,
        enabled_themes,
        enabled_modules,
        read_only_modules,
        kyc_data,
        status,
        submitted_at
    )
    VALUES (
        p_user_id,
        p_org_id,
        p_pricing_model,
        p_subscription_option,
        v_kyc_status,
        v_profile_balance,
        v_enabled_themes,
        v_enabled_modules,
        v_read_only_modules,
        p_kyc_data,
        'pending',
        NOW()
    )
    RETURNING id INTO v_activation_id;

    -- Mise à jour ou insertion dans profiles
    INSERT INTO public.profiles (
        id,
        organization_id,
        kyc_status,
        pricing_model,
        enabled_themes,
        wallet_balance,
        updated_at
    )
    VALUES (
        p_user_id,
        p_org_id,
        v_kyc_status,
        p_pricing_model,
        v_enabled_themes,
        v_profile_balance,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        organization_id = COALESCE(EXCLUDED.organization_id, profiles.organization_id),
        kyc_status = EXCLUDED.kyc_status,
        pricing_model = EXCLUDED.pricing_model,
        enabled_themes = EXCLUDED.enabled_themes,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'activation_id', v_activation_id,
        'user_id', p_user_id,
        'pricing_model', p_pricing_model,
        'subscription_option', p_subscription_option,
        'kyc_status', v_kyc_status,
        'enabled_themes', v_enabled_themes,
        'enabled_modules', v_enabled_modules,
        'read_only_modules', v_read_only_modules,
        'message', 'Dossier transmis au super admin avec configuration de licence contextuelle'
    );
END;
$$;

-- =======================================================================
-- 6. FONCTION STOCKÉE : Achat à la carte de produit/module injecté dans le Thème Gratuit
-- =======================================================================
CREATE OR REPLACE FUNCTION public.inject_carte_module_to_free_theme(
    p_user_id UUID,
    p_module_key TEXT,
    p_price NUMERIC(12, 2) DEFAULT 0.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance NUMERIC(12, 2);
    v_injected JSONB;
BEGIN
    SELECT wallet_balance INTO v_balance
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_balance IS NULL THEN
        v_balance := 0.00;
    END IF;

    IF p_price > 0 THEN
        IF v_balance < p_price THEN
            RETURN jsonb_build_object('success', false, 'error', 'Solde insuffisant pour acheter ce module à la carte');
        END IF;

        UPDATE public.profiles
        SET wallet_balance = wallet_balance - p_price,
            updated_at = NOW()
        WHERE id = p_user_id;
    END IF;

    -- Ajout du module dans les modules injectés du compte
    UPDATE public.account_activations
    SET injected_carte_modules = injected_carte_modules || jsonb_build_array(p_module_key),
        enabled_modules = enabled_modules || jsonb_build_array(p_module_key),
        read_only_modules = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements_text(read_only_modules) elem
            WHERE elem <> p_module_key
        ),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Module injecté avec succès dans le Thème Gratuit',
        'module_key', p_module_key
    );
END;
$$;

-- =======================================================================
-- 7. TARIFICATION PAY-AS-YOU-GO : Produits supplémentaires & Tunnels de vente
-- =======================================================================
INSERT INTO public.usage_service_rates (
    usage_code,
    service_name,
    rate_per_unit,
    credit_units_per_act,
    unit_label,
    currency,
    is_active,
    description
) VALUES
(
    'usage-extra-product',
    'Produit supplémentaire actif au catalogue (au-delà des 3 gratuits)',
    1000.00,
    10,
    'produit',
    'XOF',
    true,
    'Déblocage d''un produit supplémentaire dans le catalogue marchand au-delà des 3 produits inclus gratuitement. Débité directement du Wallet sans KYC.'
),
(
    'usage-sales-funnel',
    'Tunnel de vente modulaire supplémentaire',
    5000.00,
    50,
    'tunnel',
    'XOF',
    true,
    'Création et publication d''un tunnel de vente haute conversion 1-clic supplémentaire pour l''offre gratuite. Débité directement du Wallet sans KYC.'
)
ON CONFLICT (usage_code) DO UPDATE SET
    service_name = EXCLUDED.service_name,
    rate_per_unit = EXCLUDED.rate_per_unit,
    credit_units_per_act = EXCLUDED.credit_units_per_act,
    unit_label = EXCLUDED.unit_label,
    description = EXCLUDED.description,
    updated_at = NOW();
