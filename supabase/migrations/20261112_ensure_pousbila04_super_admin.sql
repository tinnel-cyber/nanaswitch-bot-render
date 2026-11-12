-- =============================================================================
-- MIGRATION SUPABASE : ACCRÉDITATION OFFICIELLE SUPER ADMIN POUSBILA04
-- Date : 2026-11-12
-- Email principal : pousbila04@gmail.com
-- =============================================================================

-- 1. Accorder le rôle dans public.super_admins et public.profiles
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Recherche par email dans auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'pousbila04@gmail.com' LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Garantir la présence dans public.profiles
    INSERT INTO public.profiles (id, email, full_name, role, kyc_status, pricing_model)
    VALUES (v_user_id, 'pousbila04@gmail.com', 'Super Admin Fondateur', 'super_admin', 'verified', 'elite')
    ON CONFLICT (id) DO UPDATE 
    SET role = 'super_admin',
        email = 'pousbila04@gmail.com',
        kyc_status = 'verified';

    -- Accorder les privilèges dans public.super_admins
    INSERT INTO public.super_admins (user_id, role, granted_at)
    VALUES (v_user_id, 'super_admin', now())
    ON CONFLICT (user_id) DO UPDATE 
    SET role = 'super_admin';
  END IF;
END $$;

-- 2. Fonction trigger pour auto-promouvoir pousbila04@gmail.com dès l'inscription / connexion
CREATE OR REPLACE FUNCTION public.handle_super_admin_signup()
RETURNS TRIGGER AS $$
BEGIN
  IF lower(NEW.email) = 'pousbila04@gmail.com' THEN
    -- Inscription dans profiles
    INSERT INTO public.profiles (id, email, full_name, role, kyc_status, pricing_model)
    VALUES (NEW.id, NEW.email, 'Super Admin Fondateur', 'super_admin', 'verified', 'elite')
    ON CONFLICT (id) DO UPDATE
    SET role = 'super_admin',
        email = NEW.email,
        kyc_status = 'verified';

    -- Inscription dans super_admins
    INSERT INTO public.super_admins (user_id, role, granted_at)
    VALUES (NEW.id, 'super_admin', now())
    ON CONFLICT (user_id) DO UPDATE
    SET role = 'super_admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur auth.users (si autorisé dans l'environnement Supabase)
DROP TRIGGER IF EXISTS on_super_admin_user_created ON auth.users;
CREATE TRIGGER on_super_admin_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_super_admin_signup();
