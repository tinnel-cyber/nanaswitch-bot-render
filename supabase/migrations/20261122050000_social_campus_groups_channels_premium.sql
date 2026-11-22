-- ==============================================================================
-- Migration Chantier 6 : Campus Social Unifié (Groupes Privés, Salons style
-- Discord/Microsoft Teams, Rooms Premium sur Abonnement, Likes & Threads)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.campus_groups (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL DEFAULT 'global',
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'public', -- 'public' | 'private' | 'premium'
  invite_code TEXT,
  subscription_price INTEGER NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'one_time'
  owner_id TEXT NOT NULL,
  owner_name TEXT NOT NULL DEFAULT 'Formateur',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campus_groups_course ON public.campus_groups (course_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.campus_channels (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  course_id TEXT NOT NULL DEFAULT 'global',
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  channel_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'announcements' | 'premium_room'
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  subscription_price INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campus_channels_group ON public.campus_channels (group_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.campus_memberships (
  id TEXT PRIMARY KEY,
  group_id TEXT,
  channel_id TEXT,
  user_id TEXT NOT NULL,
  user_name TEXT DEFAULT 'Étudiant',
  role TEXT NOT NULL DEFAULT 'member', -- 'member' | 'moderator' | 'owner'
  access_type TEXT NOT NULL DEFAULT 'free', -- 'free' | 'invite' | 'premium_subscription'
  payment_ref TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campus_memberships_user ON public.campus_memberships (user_id, group_id, channel_id);

ALTER TABLE public.campus_messages ADD COLUMN IF NOT EXISTS group_id TEXT;
ALTER TABLE public.campus_messages ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE public.campus_messages ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.campus_messages ADD COLUMN IF NOT EXISTS liked_by JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.campus_messages ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.campus_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_campus_messages_channel ON public.campus_messages (channel_id, created_at DESC);
