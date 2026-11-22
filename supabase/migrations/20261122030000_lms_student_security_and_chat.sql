-- ==============================================================================
-- Migration Chantier 2 LMS : Profils Étudiants, Inscriptions Vérifiées,
-- Quiz, Certificats & Chat Multi-Utilisateurs du Campus Privé
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.enrollments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT DEFAULT '',
  student_email TEXT,
  student_phone TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  completed_lessons JSONB DEFAULT '[]'::jsonb,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments (student_id, course_id);

CREATE TABLE IF NOT EXISTS public.student_quizzes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  lesson_id TEXT DEFAULT '',
  quiz_title TEXT NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 100,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_quizzes_student ON public.student_quizzes (student_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS public.student_certificates (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  course_title TEXT NOT NULL,
  student_name TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_certificates_student ON public.student_certificates (student_id, issued_at DESC);

CREATE TABLE IF NOT EXISTS public.campus_messages (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'STUDENT',
  content TEXT NOT NULL,
  topic_tag TEXT DEFAULT 'ENTRAIDE',
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campus_messages_course ON public.campus_messages (course_id, created_at DESC);
