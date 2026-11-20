-- ==============================================================================
-- MIGRATION SUPABASE : LMS & COURSE FORGE FULL-SUITE (SUPABASE SQL & REALTIME)
-- Remplace définitivement les dépendances Firebase Firestore / Storage dans le LMS
-- Date : 2026-11-09
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Extension de la table courses pour supporter les structures visuelles (Canvas DAG & Dnd)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'settings') THEN
            ALTER TABLE public.courses ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'modules') THEN
            ALTER TABLE public.courses ADD COLUMN modules JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'nodes') THEN
            ALTER TABLE public.courses ADD COLUMN nodes JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'edges') THEN
            ALTER TABLE public.courses ADD COLUMN edges JSONB DEFAULT '[]'::jsonb;
        END IF;
    END IF;
END $$;

-- 2. Table public.assignment_submissions (Rendus et Notations des Devoirs Étudiants)
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    assignment_id TEXT,
    assignment_title TEXT,
    student_id TEXT NOT NULL,
    student_name TEXT,
    student_email TEXT,
    student_avatar_url TEXT,
    course_id TEXT NOT NULL,
    course_title TEXT,
    lesson_id TEXT,
    lesson_title TEXT,
    file_name TEXT,
    file_size NUMERIC DEFAULT 0,
    file_url TEXT,
    file_type TEXT DEFAULT 'PDF',
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'GRADED', 'NEEDS_REVISION', 'REJECTED')),
    grade NUMERIC,
    max_score NUMERIC DEFAULT 20,
    passed BOOLEAN,
    feedback TEXT,
    voice_feedback_url TEXT,
    voice_duration_seconds NUMERIC,
    graded_at TIMESTAMPTZ,
    graded_by_name TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_subs_course ON public.assignment_submissions (course_id);
CREATE INDEX IF NOT EXISTS idx_assignment_subs_student ON public.assignment_submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_subs_status ON public.assignment_submissions (status);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assignment_submissions_policy" ON public.assignment_submissions;
CREATE POLICY "assignment_submissions_policy" ON public.assignment_submissions FOR ALL USING (true) WITH CHECK (true);

-- 3. Table public.course_content_bank (Banque de ressources de formation Supabase)
CREATE TABLE IF NOT EXISTS public.course_content_bank (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    title TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'PDF',
    file_size TEXT NOT NULL DEFAULT '1 MB',
    download_url TEXT NOT NULL,
    storage_path TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_content_bank_course ON public.course_content_bank (course_id);

ALTER TABLE public.course_content_bank ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_content_bank_policy" ON public.course_content_bank;
CREATE POLICY "course_content_bank_policy" ON public.course_content_bank FOR ALL USING (true) WITH CHECK (true);

-- 4. Publication Realtime Supabase pour les devoirs et ressources
DO $$
DECLARE
    tbl text;
    lms_realtime_tables text[] := ARRAY[
        'assignment_submissions',
        'course_content_bank',
        'enrollments',
        'courses'
    ];
BEGIN
    FOREACH tbl IN ARRAY lms_realtime_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' AND tablename = tbl
            ) THEN
                BEGIN
                    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
            END IF;
        END IF;
    END LOOP;
END $$;
