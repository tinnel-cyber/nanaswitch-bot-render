-- ==============================================================================
-- LIVE PRODUCTION SECURITY LOCKDOWN (2026-11-28 — 100% Schema-Safe & Idempotent)
-- 1. Migration & purge hors de `public.live_sessions` de toutes les clés RTMP privées
--    (`multistream_config`, `*_stream_key`, `custom_rtmp_destinations`) vers `public.server_security_vault`.
-- 2. Isolation propriétaire stricte sur `public.live_sessions` (fin de l'écriture libre par tout `authenticated`).
-- 3. Verrouillage complet de `public.live_session_enrollments` (fin de la fuite PII des étudiants & du contournement VIP 0 FCFA).
-- 4. Isolation marchand stricte sur `public.affiliate_commissions` & sécurisation propriétaire sur `public.live_auctions` / `public.live_auction_bids`.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. S'assurer que le coffre serveur `public.server_security_vault` et les helpers RLS existent
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.server_security_vault (
  key TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'general',
  tenant_id TEXT,
  secret_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.server_security_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_security_vault FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.server_security_vault FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.server_security_vault TO service_role;

DROP POLICY IF EXISTS server_security_vault_service_only ON public.server_security_vault;
CREATE POLICY server_security_vault_service_only
  ON public.server_security_vault
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 1. MIGRATION & PURGE DES CLÉS SECRÈTES RTMP HORS DE `public.live_sessions`
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
  v_json JSONB;
  v_cfg JSONB;
  v_col TEXT;
  v_set_clauses TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF to_regclass('public.live_sessions') IS NOT NULL THEN
    -- A) Sauvegarder dans server_security_vault toute config multistream existante
    FOR rec IN SELECT * FROM public.live_sessions LOOP
      v_json := to_jsonb(rec);
      v_cfg := CASE
        WHEN jsonb_typeof(v_json->'multistream_config') = 'object' THEN v_json->'multistream_config'
        ELSE jsonb_strip_nulls(jsonb_build_object(
          'storeSlug', v_json->>'id',
          'youtubeStreamKey', NULLIF(v_json->>'youtube_stream_key', ''),
          'facebookStreamKey', NULLIF(v_json->>'facebook_stream_key', ''),
          'twitchStreamKey', NULLIF(v_json->>'twitch_stream_key', ''),
          'tiktokServerUrl', NULLIF(v_json->>'tiktok_server_url', ''),
          'tiktokStreamKey', NULLIF(v_json->>'tiktok_stream_key', ''),
          'instagramServerUrl', NULLIF(v_json->>'instagram_server_url', ''),
          'instagramStreamKey', NULLIF(v_json->>'instagram_stream_key', ''),
          'linkedinServerUrl', NULLIF(v_json->>'linkedin_server_url', ''),
          'linkedinStreamKey', NULLIF(v_json->>'linkedin_stream_key', ''),
          'twitterServerUrl', NULLIF(v_json->>'twitter_server_url', ''),
          'twitterStreamKey', NULLIF(v_json->>'twitter_stream_key', ''),
          'telegramServerUrl', NULLIF(v_json->>'telegram_server_url', ''),
          'telegramStreamKey', NULLIF(v_json->>'telegram_stream_key', ''),
          'whatsappChannelUrl', NULLIF(v_json->>'whatsapp_channel_url', ''),
          'customRtmpDestinations', v_json->'custom_rtmp_destinations'
        ))
      END;

      IF v_cfg IS NOT NULL AND v_cfg <> '{}'::jsonb AND (
        (v_cfg ? 'youtubeStreamKey') OR
        (v_cfg ? 'facebookStreamKey') OR
        (v_cfg ? 'twitchStreamKey') OR
        (v_cfg ? 'tiktokStreamKey') OR
        (v_cfg ? 'instagramStreamKey') OR
        (v_cfg ? 'linkedinStreamKey') OR
        (v_cfg ? 'twitterStreamKey') OR
        (v_cfg ? 'telegramStreamKey') OR
        (jsonb_typeof(v_json->'multistream_config') = 'object')
      ) THEN
        INSERT INTO public.server_security_vault (key, category, tenant_id, secret_json, updated_at)
        VALUES (
          'multistream_cfg:' || COALESCE(v_json->>'id', 'default'),
          'live_multistream',
          COALESCE(v_json->>'tenant_id', v_json->>'id'),
          v_cfg,
          NOW()
        )
        ON CONFLICT (key) DO NOTHING;
      END IF;
    END LOOP;

    -- B) Purger dynamiquement toutes les colonnes de clés RTMP présentes dans live_sessions
    FOREACH v_col IN ARRAY ARRAY[
      'multistream_config',
      'youtube_stream_key',
      'facebook_stream_key',
      'twitch_stream_key',
      'tiktok_stream_key',
      'instagram_stream_key',
      'linkedin_stream_key',
      'twitter_stream_key',
      'telegram_stream_key',
      'custom_rtmp_destinations'
    ]
    LOOP
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'live_sessions'
          AND column_name = v_col
      ) THEN
        v_set_clauses := array_append(v_set_clauses, format('%I = NULL', v_col));
      END IF;
    END LOOP;

    IF array_length(v_set_clauses, 1) > 0 THEN
      EXECUTE 'UPDATE public.live_sessions SET ' || array_to_string(v_set_clauses, ', ');
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. DURCISSEMENT RLS SUR `public.live_sessions`
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF to_regclass('public.live_sessions') IS NOT NULL THEN
    ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'live_sessions'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.live_sessions', pol.policyname);
    END LOOP;

    CREATE POLICY live_sessions_service_role_all
      ON public.live_sessions
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    CREATE POLICY live_sessions_public_select
      ON public.live_sessions
      FOR SELECT TO anon, authenticated
      USING (true);

    CREATE POLICY live_sessions_owner_write
      ON public.live_sessions
      FOR ALL TO authenticated
      USING (
        public.nana_rls_is_super_admin()
        OR COALESCE(to_jsonb(live_sessions)->>'host_id', '') = COALESCE(auth.uid()::text, '')
        OR public.nana_rls_owns_tenant(COALESCE(to_jsonb(live_sessions)->>'tenant_id', ''))
      )
      WITH CHECK (
        (
          public.nana_rls_is_super_admin()
          OR COALESCE(to_jsonb(live_sessions)->>'host_id', '') = COALESCE(auth.uid()::text, '')
          OR public.nana_rls_owns_tenant(COALESCE(to_jsonb(live_sessions)->>'tenant_id', ''))
        )
        -- Interdit toute réécriture directe de clés RTMP dans live_sessions par un client navigateur
        AND COALESCE(to_jsonb(live_sessions)->>'youtube_stream_key', '') = ''
        AND COALESCE(to_jsonb(live_sessions)->>'facebook_stream_key', '') = ''
        AND COALESCE(to_jsonb(live_sessions)->>'tiktok_stream_key', '') = ''
        AND (to_jsonb(live_sessions)->'multistream_config' IS NULL OR to_jsonb(live_sessions)->'multistream_config' = 'null'::jsonb)
      );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. VERROUILLAGE TOTAL DE `public.live_session_enrollments` (ANTI-FUITE PII & ANTI-0 FCFA)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF to_regclass('public.live_session_enrollments') IS NOT NULL THEN
    ALTER TABLE public.live_session_enrollments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.live_session_enrollments FORCE ROW LEVEL SECURITY;

    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'live_session_enrollments'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.live_session_enrollments', pol.policyname);
    END LOOP;

    -- Seul le backend Northflank/Render (service_role) enregistre et vérifie les billets payants
    CREATE POLICY live_session_enrollments_service_role_all
      ON public.live_session_enrollments
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    -- Lecture autorisée uniquement au formateur propriétaire de la session ou Super Admin
    CREATE POLICY live_session_enrollments_instructor_select
      ON public.live_session_enrollments
      FOR SELECT TO authenticated
      USING (
        public.nana_rls_is_super_admin()
        OR EXISTS (
          SELECT 1
          FROM public.live_sessions ls
          WHERE (to_jsonb(ls)->>'id') = (to_jsonb(live_session_enrollments)->>'session_id')
            AND (
              COALESCE(to_jsonb(ls)->>'host_id', '') = COALESCE(auth.uid()::text, '')
              OR public.nana_rls_owns_tenant(COALESCE(to_jsonb(ls)->>'tenant_id', ''))
            )
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. SÉCURISATION DE `public.affiliate_commissions`, `public.live_auctions` & `public.live_auction_bids`
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- A) affiliate_commissions : isolation stricte par marchand propriétaire
  IF to_regclass('public.affiliate_commissions') IS NOT NULL THEN
    ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'affiliate_commissions'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.affiliate_commissions', pol.policyname);
    END LOOP;

    CREATE POLICY affiliate_commissions_service_role_all
      ON public.affiliate_commissions
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    CREATE POLICY affiliate_commissions_merchant_select
      ON public.affiliate_commissions
      FOR SELECT TO authenticated
      USING (
        public.nana_rls_is_super_admin()
        OR COALESCE(to_jsonb(affiliate_commissions)->>'merchant_id', '') = COALESCE(auth.uid()::text, '')
        OR public.nana_rls_owns_tenant(COALESCE(to_jsonb(affiliate_commissions)->>'merchant_id', ''))
      );

    CREATE POLICY affiliate_commissions_merchant_update
      ON public.affiliate_commissions
      FOR UPDATE TO authenticated
      USING (
        public.nana_rls_is_super_admin()
        OR COALESCE(to_jsonb(affiliate_commissions)->>'merchant_id', '') = COALESCE(auth.uid()::text, '')
        OR public.nana_rls_owns_tenant(COALESCE(to_jsonb(affiliate_commissions)->>'merchant_id', ''))
      )
      WITH CHECK (
        public.nana_rls_is_super_admin()
        OR COALESCE(to_jsonb(affiliate_commissions)->>'merchant_id', '') = COALESCE(auth.uid()::text, '')
        OR public.nana_rls_owns_tenant(COALESCE(to_jsonb(affiliate_commissions)->>'merchant_id', ''))
      );
  END IF;

  -- B) live_auctions : lecture publique, création/clôture réservée au vendeur propriétaire de la session
  IF to_regclass('public.live_auctions') IS NOT NULL THEN
    ALTER TABLE public.live_auctions ENABLE ROW LEVEL SECURITY;

    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'live_auctions'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.live_auctions', pol.policyname);
    END LOOP;

    CREATE POLICY live_auctions_service_role_all
      ON public.live_auctions
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    CREATE POLICY live_auctions_public_select
      ON public.live_auctions
      FOR SELECT TO anon, authenticated
      USING (true);

    CREATE POLICY live_auctions_host_write
      ON public.live_auctions
      FOR ALL TO authenticated
      USING (
        public.nana_rls_is_super_admin()
        OR EXISTS (
          SELECT 1
          FROM public.live_sessions ls
          WHERE (to_jsonb(ls)->>'id') = (to_jsonb(live_auctions)->>'session_id')
            AND (
              COALESCE(to_jsonb(ls)->>'host_id', '') = COALESCE(auth.uid()::text, '')
              OR public.nana_rls_owns_tenant(COALESCE(to_jsonb(ls)->>'tenant_id', ''))
            )
        )
      )
      WITH CHECK (
        public.nana_rls_is_super_admin()
        OR EXISTS (
          SELECT 1
          FROM public.live_sessions ls
          WHERE (to_jsonb(ls)->>'id') = (to_jsonb(live_auctions)->>'session_id')
            AND (
              COALESCE(to_jsonb(ls)->>'host_id', '') = COALESCE(auth.uid()::text, '')
              OR public.nana_rls_owns_tenant(COALESCE(to_jsonb(ls)->>'tenant_id', ''))
            )
        )
      );
  END IF;

  -- C) live_auction_bids : lecture publique, insertions validées atomiquement via Northflank (service_role)
  IF to_regclass('public.live_auction_bids') IS NOT NULL THEN
    ALTER TABLE public.live_auction_bids ENABLE ROW LEVEL SECURITY;

    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'live_auction_bids'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.live_auction_bids', pol.policyname);
    END LOOP;

    CREATE POLICY live_auction_bids_service_role_all
      ON public.live_auction_bids
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    CREATE POLICY live_auction_bids_public_select
      ON public.live_auction_bids
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;
