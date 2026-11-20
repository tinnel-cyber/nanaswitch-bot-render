-- Migration: Table dédiée aux réservations de Coaching 1-to-1 (Supabase Auth + Live Coaching)
CREATE TABLE IF NOT EXISTS public.coaching_bookings (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  store_slug TEXT NOT NULL,
  user_id UUID NULL,
  coach_name TEXT NOT NULL,
  consultation_type TEXT NOT NULL DEFAULT 'Coaching 1-to-1',
  booking_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT DEFAULT '',
  whatsapp_phone TEXT NOT NULL,
  objective_notes TEXT DEFAULT '',
  room_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaching_bookings_store_slug ON public.coaching_bookings (store_slug, created_at DESC);
