-- ==============================================================================
-- MIGRATION SUPABASE : MODULE MULTISTREAMING LIVE RÉEL (MediaMTX + FFmpeg)
-- ==============================================================================
-- Exécutez ce script dans le tableau de bord Supabase > SQL Editor
-- pour ajouter le support de la multidiffusion simultanée vers les réseaux sociaux.

-- 1. Ajout des colonnes de multidiffusion à la table public.live_sessions
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS multistream_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS youtube_stream_key TEXT,
  ADD COLUMN IF NOT EXISTS facebook_stream_key TEXT,
  ADD COLUMN IF NOT EXISTS twitch_stream_key TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_server_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_stream_key TEXT,
  ADD COLUMN IF NOT EXISTS instagram_server_url TEXT DEFAULT 'rtmps://live-upload.instagram.com:443/rtmp/',
  ADD COLUMN IF NOT EXISTS instagram_stream_key TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_server_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_stream_key TEXT,
  ADD COLUMN IF NOT EXISTS twitter_server_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_stream_key TEXT,
  ADD COLUMN IF NOT EXISTS telegram_server_url TEXT DEFAULT 'rtmps://dc4-1.rtmp.t.me/s/',
  ADD COLUMN IF NOT EXISTS telegram_stream_key TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_channel_url TEXT,
  ADD COLUMN IF NOT EXISTS custom_rtmp_destinations JSONB DEFAULT '[]'::jsonb;

-- 2. Indexation pour les performances de recherche par boutique / session
CREATE INDEX IF NOT EXISTS idx_live_sessions_tenant ON public.live_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_is_live ON public.live_sessions(is_live);

-- 3. Activation du Realtime pour synchronisation en direct des mises à jour (Idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'live_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
  END IF;
END $$;

-- 4. Commentaire de documentation
COMMENT ON COLUMN public.live_sessions.multistream_config IS 'Configuration complète du générateur de live et des clés de flux réseaux sociaux';

-- 5. Table des abonnements Push Web VAPID (si pas encore créée)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT,
  auth TEXT,
  user_id TEXT,
  store_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Si la table existait déjà sans ces colonnes, on les ajoute en toute sécurité
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS store_slug TEXT,
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS p256dh TEXT,
  ADD COLUMN IF NOT EXISTS auth TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Indexation pour recherche rapide par boutique ou par vendeur
CREATE INDEX IF NOT EXISTS idx_push_subs_store_slug ON public.push_subscriptions(store_slug);
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);

-- Activation de RLS sécurisé
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Allow public insert and read'
  ) THEN
    CREATE POLICY "Allow public insert and read" ON public.push_subscriptions
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
