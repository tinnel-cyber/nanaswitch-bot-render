-- ==============================================================================
-- Migration Chantier 8 : Modèles de Tarification de Cours (À Vie, Abonnement
-- Jour/Semaine/Mois/Année, Cours Direct Live) & Contrôle Serveur expires_at
-- ==============================================================================

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS pricing_model TEXT NOT NULL DEFAULT 'lifetime'; -- 'lifetime' | 'subscription' | 'live_event'
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS billing_interval TEXT; -- 'day' | 'week' | 'month' | 'year'
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS live_ends_at TIMESTAMPTZ;

ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS pricing_model TEXT NOT NULL DEFAULT 'lifetime';
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS billing_interval TEXT;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS last_renewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_enrollments_expiry ON public.enrollments (student_id, course_id, expires_at);
