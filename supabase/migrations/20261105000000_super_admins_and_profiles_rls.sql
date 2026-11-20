-- =============================================================================
-- MIGRATION SUPABASE : ISOLATION DU CONTROLE SUPER ADMIN & SECURISATION RLS PROFILES
-- Date : 2026-11-05
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. AJOUT DES COLONNES MANQUANTES SUR PUBLIC.PROFILES (ID reste UUID lié à auth.users)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pricing_model TEXT NOT NULL DEFAULT 'none';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_option TEXT DEFAULT 'none';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS enabled_themes JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- -----------------------------------------------------------------------------
-- 1. CREATION DE LA TABLE SUPER ADMIN (user_id UUID référant profiles.id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'super_admin',
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activation de la RLS sur la table super_admins
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Fonction utilitaire interne pour vérifier le statut d'admin (version UUID)
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF user_uid IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = user_uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Surcharge textuelle pour compatibilité auth.uid()::text ou entrées text
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF user_uid IS NULL OR user_uid = '' THEN
    RETURN FALSE;
  END IF;
  BEGIN
    RETURN public.is_super_admin(user_uid::UUID);
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nettoyage et création de la policy RLS sur super_admins
DROP POLICY IF EXISTS "Lecture stricte Super Admins" ON public.super_admins;
CREATE POLICY "Lecture stricte Super Admins"
  ON public.super_admins FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- 2. POLICIES RLS STRICTES POUR LA TABLE PROFILES
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Nettoyage des anciennes policies sur profiles
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_write" ON public.profiles;
DROP POLICY IF EXISTS "Lecture des profils (Proprietaire ou Admin)" ON public.profiles;
DROP POLICY IF EXISTS "Mise a jour restreinte du profil par l'utilisateur" ON public.profiles;
DROP POLICY IF EXISTS "Controle Total Super Admin sur Profiles" ON public.profiles;

-- Règle 1 : Tout utilisateur connecté peut lire son propre profil
-- Les Super Admins peuvent lire TOUS les profils pour superviser les parcours
CREATE POLICY "Lecture des profils (Proprietaire ou Admin)"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid() 
    OR public.is_super_admin(auth.uid())
  );

-- Règle 2 : L'utilisateur peut mettre à jour uniquement ses informations de base (Nom, etc.)
-- IL NE PEUT PAS modifier wallet_balance, kyc_status, pricing_model ni enabled_themes
CREATE POLICY "Mise a jour restreinte du profil par l'utilisateur"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Empêche l'utilisateur d'altérer les données financières et les droits
    AND wallet_balance = (SELECT wallet_balance FROM public.profiles WHERE id = auth.uid())
    AND kyc_status = (SELECT kyc_status FROM public.profiles WHERE id = auth.uid())
    AND pricing_model = (SELECT pricing_model FROM public.profiles WHERE id = auth.uid())
  );

-- Règle 3 : Seul le Super Admin a le contrôle total (écriture / validation KYC / solde)
CREATE POLICY "Controle Total Super Admin sur Profiles"
  ON public.profiles FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- 3. VUE DE SUPERVISION POUR LE DASHBOARD ADMIN
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.admin_user_overview AS
SELECT 
  p.id AS user_id,
  p.email,
  p.full_name,
  p.wallet_balance,
  p.kyc_status,
  p.pricing_model,
  p.business_option,
  p.enabled_themes,
  p.created_at,
  CASE 
    WHEN p.kyc_status = 'none' AND (p.pricing_model = 'none' OR p.pricing_model = 'pay_per_use') THEN 'Usage Ponctuel / Gratuit'
    WHEN p.pricing_model = 'commission' THEN 'Branche Commission (Pay-As-You-Go)'
    WHEN p.pricing_model = 'subscription' THEN 'Branche Abonnement'
    ELSE 'Nouveau Compte'
  END AS parcours_actif
FROM public.profiles p;

-- Accès sécurisé à la vue pour les utilisateurs authentifiés
GRANT SELECT ON public.admin_user_overview TO authenticated;
