-- Migration: Assurer que Konkobo Pousbila (pousbila04@gmail.com & contact@nanasore.com)
-- est le seul Super Admin officiel dans Supabase et nettoyer admin@nanasore.ci

DO $$
DECLARE
  v_admin RECORD;
BEGIN
  -- 1. Promouvoir pousbila04@gmail.com et contact@nanasore.com dans profiles et super_admins
  FOR v_admin IN
    SELECT id, email FROM auth.users
    WHERE LOWER(email) IN ('pousbila04@gmail.com', 'contact@nanasore.com')
  LOOP
    INSERT INTO public.profiles (id, email, full_name, role, kyc_status, subscription_plan)
    VALUES (v_admin.id, v_admin.email, 'Konkobo Pousbila', 'super_admin', 'verified', 'elite')
    ON CONFLICT (id) DO UPDATE SET
      full_name = 'Konkobo Pousbila',
      role = 'super_admin',
      kyc_status = 'verified',
      subscription_plan = 'elite',
      updated_at = NOW();

    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'super_admins'
    ) THEN
      INSERT INTO public.super_admins (user_id, role, granted_at)
      VALUES (v_admin.id, 'super_admin', NOW())
      ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
    END IF;
  END LOOP;

  -- 2. Retirer le rôle admin à tout éventuel compte admin@nanasore.ci
  UPDATE public.profiles
  SET role = 'merchant', updated_at = NOW()
  WHERE LOWER(COALESCE(email, '')) = 'admin@nanasore.ci';

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    UPDATE public.users
    SET role = 'merchant'
    WHERE LOWER(COALESCE(email, '')) = 'admin@nanasore.ci';

    UPDATE public.users
    SET role = 'super_admin', name = 'Konkobo Pousbila'
    WHERE LOWER(COALESCE(email, '')) IN ('pousbila04@gmail.com', 'contact@nanasore.com');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_super_admin_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF LOWER(COALESCE(NEW.email, '')) IN ('pousbila04@gmail.com', 'contact@nanasore.com') THEN
    INSERT INTO public.profiles (id, email, full_name, role, kyc_status, subscription_plan, updated_at)
    VALUES (NEW.id, NEW.email, 'Konkobo Pousbila', 'super_admin', 'verified', 'elite', NOW())
    ON CONFLICT (id) DO UPDATE SET
      full_name = 'Konkobo Pousbila',
      role = 'super_admin',
      kyc_status = 'verified',
      subscription_plan = 'elite',
      updated_at = NOW();

    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'super_admins'
    ) THEN
      INSERT INTO public.super_admins (user_id, role, granted_at)
      VALUES (NEW.id, 'super_admin', NOW())
      ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[handle_super_admin_signup] ignored error: %', SQLERRM;
    RETURN NEW;
END;
$$;
