-- ==============================================================================
-- Schema Supabase : Architecture Multi-Tenant Hybride (Marque Blanche & Standard)
-- Module : Nanasore & Académie (Courses, Lessons, Enrollments, Funnels)
-- Fichier : database/schema_multitenant.sql
-- ==============================================================================

-- 1. Types Énumérés (ENUM)
DO $$ BEGIN
    CREATE TYPE tenant_routing_type AS ENUM ('standard', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tenant_domain_status AS ENUM ('none', 'pending', 'active', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Table public.tenants
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    routing_type tenant_routing_type NOT NULL DEFAULT 'standard',
    custom_domain TEXT UNIQUE NULL,
    domain_status tenant_domain_status NOT NULL DEFAULT 'none',
    cloudflare_hostname_id TEXT NULL,
    dns_records JSONB NOT NULL DEFAULT '{}'::jsonb,
    logo_url TEXT NULL,
    primary_color TEXT NOT NULL DEFAULT '#000000',
    secondary_color TEXT NOT NULL DEFAULT '#ffffff',
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON public.tenants (LOWER(custom_domain)) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants (LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_tenants_routing_type ON public.tenants (routing_type);
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON public.tenants (owner_id);

-- 3. Table public.tenant_members
CREATE TABLE IF NOT EXISTS public.tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'instructor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_member UNIQUE (tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON public.tenant_members (user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON public.tenant_members (tenant_id);

-- 4. Table public.courses
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    thumbnail_url TEXT,
    status course_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_courses_tenant_slug UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_courses_tenant_id ON public.courses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses (status);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses (slug);

-- 5. Table public.lessons
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT,
    content TEXT,
    position INTEGER NOT NULL DEFAULT 1 CHECK (position >= 1),
    is_free_preview BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons (course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_tenant_id ON public.lessons (tenant_id);
CREATE INDEX IF NOT EXISTS idx_lessons_position ON public.lessons (course_id, position ASC);

-- 6. Table public.enrollments
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'revoked')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_enrollment_course_user UNIQUE (course_id, user_id),
    CONSTRAINT uq_enrollment_course_email UNIQUE (course_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_tenant_id ON public.enrollments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments (user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_email ON public.enrollments (LOWER(user_email));

-- 7. Table public.funnels
CREATE TABLE IF NOT EXISTS public.funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_funnels_tenant_slug UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_funnels_tenant_id ON public.funnels (tenant_id);
CREATE INDEX IF NOT EXISTS idx_funnels_slug ON public.funnels (slug);

-- 8. Mise à jour de products et orders
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.products ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products (tenant_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.orders ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON public.orders (tenant_id);
    END IF;
END $$;

-- 9. RLS & Politiques de Sécurité
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_tenant_member(check_tenant_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.tenant_members
        WHERE tenant_id = check_tenant_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.tenants
        WHERE id = check_tenant_id AND owner_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(check_course_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE course_id = check_course_id
        AND (user_id = auth.uid() OR LOWER(user_email) = LOWER(auth.jwt()->>'email'))
        AND status = 'active'
    );
$$;

DROP POLICY IF EXISTS "tenants_public_read" ON public.tenants;
CREATE POLICY "tenants_public_read" ON public.tenants FOR SELECT USING (true);

DROP POLICY IF EXISTS "tenants_admin_manage" ON public.tenants;
CREATE POLICY "tenants_admin_manage" ON public.tenants FOR ALL USING (owner_id = auth.uid() OR public.is_tenant_member(id));

DROP POLICY IF EXISTS "courses_public_read_published" ON public.courses;
CREATE POLICY "courses_public_read_published" ON public.courses FOR SELECT USING (status = 'published' OR public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "courses_admin_manage" ON public.courses;
CREATE POLICY "courses_admin_manage" ON public.courses FOR ALL USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "lessons_read_access" ON public.lessons;
CREATE POLICY "lessons_read_access" ON public.lessons FOR SELECT USING (
    is_free_preview = true OR public.is_enrolled_in_course(course_id) OR public.is_tenant_member(tenant_id)
);

DROP POLICY IF EXISTS "lessons_admin_manage" ON public.lessons;
CREATE POLICY "lessons_admin_manage" ON public.lessons FOR ALL USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "enrollments_read_self_or_admin" ON public.enrollments;
CREATE POLICY "enrollments_read_self_or_admin" ON public.enrollments FOR SELECT USING (
    user_id = auth.uid() OR LOWER(user_email) = LOWER(auth.jwt()->>'email') OR public.is_tenant_member(tenant_id)
);

DROP POLICY IF EXISTS "enrollments_admin_manage" ON public.enrollments;
CREATE POLICY "enrollments_admin_manage" ON public.enrollments FOR ALL USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "funnels_public_read_published" ON public.funnels;
CREATE POLICY "funnels_public_read_published" ON public.funnels FOR SELECT USING (is_published = true OR public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "funnels_admin_manage" ON public.funnels;
CREATE POLICY "funnels_admin_manage" ON public.funnels FOR ALL USING (public.is_tenant_member(tenant_id));

-- ==============================================================================
-- 10. Module E-mailing & Campagnes Brevo
-- ==============================================================================

-- Ajout des quotas d'e-mails sur la table tenants
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'email_credits') THEN
        ALTER TABLE public.tenants ADD COLUMN email_credits INTEGER NOT NULL DEFAULT 1500;
        CREATE INDEX IF NOT EXISTS idx_tenants_email_credits ON public.tenants (email_credits);
    END IF;
END $$;

-- Table des clients du tenant pour le ciblage et la segmentation e-mailing
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'unsubscribed')),
    total_spent_cfa NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    orders_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customers_tenant_email UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers (status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers (LOWER(email));

-- Table de l'historique des campagnes e-mailing diffusées via Brevo
CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    segment TEXT NOT NULL DEFAULT 'all',
    recipients_count INTEGER NOT NULL DEFAULT 0,
    brevo_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_tenant_id ON public.email_campaigns (tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_sent_at ON public.email_campaigns (sent_at DESC);

-- RLS pour customers et email_campaigns
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_tenant_manage" ON public.customers;
CREATE POLICY "customers_tenant_manage" ON public.customers FOR ALL USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "campaigns_tenant_manage" ON public.email_campaigns;
CREATE POLICY "campaigns_tenant_manage" ON public.email_campaigns FOR ALL USING (public.is_tenant_member(tenant_id));

