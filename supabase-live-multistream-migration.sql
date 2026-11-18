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

-- 3. Activation du Realtime pour synchronisation en direct des mises à jour
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;

-- 4. Commentaire de documentation
COMMENT ON COLUMN public.live_sessions.multistream_config IS 'Configuration complète du générateur de live et des clés de flux réseaux sociaux';
