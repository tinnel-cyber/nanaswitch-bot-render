-- ==============================================================================
-- Migration : Sélecteur Persistant de Destinations, Thèmes Digitaux Générés,
-- Liens de Réorientation Traçables (/r/course/:code) & Analytique par Canal
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.course_destinations (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  destination_type TEXT NOT NULL, -- 'theme_digital_pro' | 'theme_live' | 'custom_digital_theme' | 'marketplace' | 'campus_private' | 'social_channel' | 'vip_room'
  destination_id TEXT NOT NULL,
  destination_label TEXT NOT NULL,
  theme_slug TEXT,
  tracking_code TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  enrollments_count INTEGER NOT NULL DEFAULT 0,
  revenue_fcfa NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_destinations_course ON public.course_destinations (course_id, is_active);
CREATE INDEX IF NOT EXISTS idx_course_destinations_code ON public.course_destinations (tracking_code);

CREATE TABLE IF NOT EXISTS public.course_destination_events (
  id TEXT PRIMARY KEY,
  tracking_code TEXT NOT NULL,
  course_id TEXT NOT NULL,
  destination_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'click' | 'enrollment'
  amount_fcfa NUMERIC NOT NULL DEFAULT 0,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_dest_events_course ON public.course_destination_events (course_id, created_at DESC);
