-- ==============================================================================
-- Schema Supabase : Profils Utilisateurs & Trigger d'Inscription Automatique
-- Projet : Cloudflare Worker + Supabase (PostgreSQL / Auth) + Brevo
-- Fichier : database/schema.sql
-- ==============================================================================

-- 1. Table public.profiles liée à auth.users
create table if not exists public.profiles (
  -- Clé primaire UUID avec référence directe et suppression en cascade sur auth.users
  id uuid primary key references auth.users(id) on delete cascade,
  
  -- Informations d'identité et profil
  full_name text,
  
  -- Rôle de l'utilisateur (défaut 'user')
  role text not null default 'user',
  
  -- Statut du compte (défaut true)
  is_active boolean not null default true,
  
  -- Horodatage de dernière mise à jour
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Commentaires explicatifs pour la documentation de la base
comment on table public.profiles is 'Table des profils utilisateurs liée en relation 1:1 avec auth.users.';
comment on column public.profiles.id is 'Identifiant unique de l''utilisateur, correspondant à auth.users.id.';
comment on column public.profiles.role is 'Rôle de l''utilisateur dans la plateforme (par ex: user, admin, agent).';
comment on column public.profiles.is_active is 'Indicateur d''activité du compte.';

-- 2. Index de performance
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_is_active on public.profiles(is_active);

-- 3. Activation de la sécurité au niveau des lignes (Row Level Security - RLS)
alter table public.profiles enable row level security;

-- Nettoyage préventif des politiques existantes pour assurer l'idempotence
drop policy if exists "Les utilisateurs peuvent consulter uniquement leur propre profil" on public.profiles;
drop policy if exists "Les utilisateurs peuvent modifier uniquement leur propre profil" on public.profiles;
drop policy if exists "Les utilisateurs peuvent inserer leur propre profil" on public.profiles;

-- 4. Politiques RLS strictes : chaque utilisateur lit et modifie UNIQUEMENT son propre profil (auth.uid() = id)

-- Politique de LECTURE (SELECT) :
create policy "Les utilisateurs peuvent consulter uniquement leur propre profil"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Politique de MODIFICATION (UPDATE) :
create policy "Les utilisateurs peuvent modifier uniquement leur propre profil"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Politique d'INSERTION (INSERT) au besoin par l'utilisateur connecté :
create policy "Les utilisateurs peuvent inserer leur propre profil"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- 5. Fonction automatique pour actualiser updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- 6. Fonction et Trigger PostgreSQL (handle_new_user)
-- Insère automatiquement un profil dans public.profiles dès qu'un utilisateur est créé dans auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_full_name text;
  v_role text;
begin
  -- Extraction sécurisée des métadonnées passées lors du signup Supabase Auth
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  v_role := coalesce(new.raw_user_meta_data->>'role', 'user');

  insert into public.profiles (id, full_name, role, is_active, updated_at)
  values (
    new.id,
    v_full_name,
    v_role,
    true,
    timezone('utc'::text, now())
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    updated_at = timezone('utc'::text, now());

  return new;
end;
$$;

-- Attachement du trigger sur auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ==============================================================================
-- 7. Table public.universes (Multi-Univers Marchand selon Appellation)
-- ==============================================================================
create table if not exists public.universes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  appellation text not null default 'E-commerce & Vente en ligne',
  sector text,
  type text not null default 'entreprise' check (type in ('entreprise', 'particulier')),
  status text not null default 'VERIFIED' check (status in ('VERIFIED', 'PENDING_KYC', 'REJECTED', 'ACTIVE', 'INACTIVE')),
  balances jsonb not null default '{"XOF": 0, "USD": 0, "XAF": 0, "GNF": 0, "GHS": 0}'::jsonb,
  keys jsonb not null default '{}'::jsonb,
  webhook_config jsonb not null default '{"url": null, "secret_key": "", "is_active": false}'::jsonb,
  kyc_data jsonb not null default '{}'::jsonb,
  integration_mode text not null default 'AGREGATED' check (integration_mode in ('AGREGATED', 'BYOK')),
  integration_config jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_user_universe_slug unique (user_id, slug)
);

create index if not exists idx_universes_user_id on public.universes (user_id);
create index if not exists idx_universes_slug on public.universes (slug);
create index if not exists idx_universes_status on public.universes (status);
create index if not exists idx_universes_appellation on public.universes (appellation);

alter table public.universes enable row level security;

drop policy if exists "Les marchands voient leurs propres univers" on public.universes;
create policy "Les marchands voient leurs propres univers"
  on public.universes for select
  using (auth.uid() = user_id);

drop policy if exists "Les marchands créent leurs propres univers" on public.universes;
create policy "Les marchands créent leurs propres univers"
  on public.universes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Les marchands modifient leurs propres univers" on public.universes;
create policy "Les marchands modifient leurs propres univers"
  on public.universes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Les marchands suppriment leurs propres univers" on public.universes;
create policy "Les marchands suppriment leurs propres univers"
  on public.universes for delete
  using (auth.uid() = user_id);

create or replace function public.handle_universes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_universes_updated_at on public.universes;
create trigger set_universes_updated_at
  before update on public.universes
  for each row
  execute function public.handle_universes_updated_at();

