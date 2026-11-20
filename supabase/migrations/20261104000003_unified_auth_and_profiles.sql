-- =======================================================================
-- MIGRATION SUPABASE : Authentification Unifiée (Supabase -> Supabase)
-- Table : profiles & RPC sync_auth_profile
-- Date : 2026-11-04
-- =======================================================================

-- 1. Mise à jour de la table profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    full_name TEXT,
    email TEXT,
    whatsapp_number TEXT,
    auth_uid TEXT UNIQUE,
    role TEXT DEFAULT 'user',
    wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0.00),
    kyc_status TEXT NOT NULL DEFAULT 'none' CHECK (kyc_status IN ('none', 'light', 'full')),
    pricing_model TEXT NOT NULL DEFAULT 'none' CHECK (pricing_model IN ('none', 'pay_per_use', 'commission', 'subscription')),
    enabled_themes JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ajout idempotent des colonnes au cas où profiles existe déjà
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'auth_uid') THEN
        ALTER TABLE public.profiles ADD COLUMN auth_uid TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'whatsapp_number') THEN
        ALTER TABLE public.profiles ADD COLUMN whatsapp_number TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'wallet_balance') THEN
        ALTER TABLE public.profiles ADD COLUMN wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0.00);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'kyc_status') THEN
        ALTER TABLE public.profiles ADD COLUMN kyc_status TEXT NOT NULL DEFAULT 'none' CHECK (kyc_status IN ('none', 'light', 'full'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'pricing_model') THEN
        ALTER TABLE public.profiles ADD COLUMN pricing_model TEXT NOT NULL DEFAULT 'none' CHECK (pricing_model IN ('none', 'pay_per_use', 'commission', 'subscription'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'enabled_themes') THEN
        ALTER TABLE public.profiles ADD COLUMN enabled_themes JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Index de performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_uid ON public.profiles(auth_uid);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON public.profiles(kyc_status);
CREATE INDEX IF NOT EXISTS idx_profiles_pricing_model ON public.profiles(pricing_model);

-- 3. Activation de RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_public_read') THEN
        CREATE POLICY profiles_public_read ON public.profiles FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_public_write') THEN
        CREATE POLICY profiles_public_write ON public.profiles FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Fonction RPC d'enregistrement et de synchronisation sans KYC à l'entrée
CREATE OR REPLACE FUNCTION public.sync_auth_profile(
    p_auth_uid TEXT,
    p_email TEXT,
    p_full_name TEXT DEFAULT '',
    p_whatsapp TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID;
    v_existing RECORD;
BEGIN
    -- Recherche du profil existant par auth_uid ou email
    SELECT * INTO v_existing 
    FROM public.profiles 
    WHERE auth_uid = p_auth_uid OR (p_email IS NOT NULL AND email = p_email)
    LIMIT 1;
    
    IF v_existing.id IS NOT NULL THEN
        -- Profil existant : préserver kyc_status, pricing_model, wallet_balance et enabled_themes
        UPDATE public.profiles
        SET 
            auth_uid = COALESCE(auth_uid, p_auth_uid),
            email = COALESCE(email, p_email),
            full_name = COALESCE(NULLIF(p_full_name, ''), full_name),
            whatsapp_number = COALESCE(NULLIF(p_whatsapp, ''), whatsapp_number),
            updated_at = NOW()
        WHERE id = v_existing.id;

        RETURN jsonb_build_object(
            'success', true,
            'profile_id', v_existing.id,
            'auth_uid', p_auth_uid,
            'email', v_existing.email,
            'full_name', v_existing.full_name,
            'whatsapp_number', v_existing.whatsapp_number,
            'kyc_status', v_existing.kyc_status,
            'pricing_model', v_existing.pricing_model,
            'wallet_balance', v_existing.wallet_balance,
            'enabled_themes', v_existing.enabled_themes,
            'is_new', false
        );
    ELSE
        -- Nouvel utilisateur : STRICTEMENT AUCUNE PERMISSION NI KYC À L'ENTRÉE
        -- kyc_status: 'none', pricing_model: 'none', wallet_balance: 0, enabled_themes: []
        INSERT INTO public.profiles (
            auth_uid,
            email,
            full_name,
            whatsapp_number,
            kyc_status,
            pricing_model,
            wallet_balance,
            enabled_themes,
            role,
            created_at,
            updated_at
        ) VALUES (
            p_auth_uid,
            p_email,
            p_full_name,
            p_whatsapp,
            'none',
            'none',
            0.00,
            '[]'::jsonb,
            'user',
            NOW(),
            NOW()
        )
        RETURNING id INTO v_profile_id;

        RETURN jsonb_build_object(
            'success', true,
            'profile_id', v_profile_id,
            'auth_uid', p_auth_uid,
            'email', p_email,
            'full_name', p_full_name,
            'whatsapp_number', p_whatsapp,
            'kyc_status', 'none',
            'pricing_model', 'none',
            'wallet_balance', 0,
            'enabled_themes', '[]'::jsonb,
            'is_new', true
        );
    END IF;
END;
$$;
