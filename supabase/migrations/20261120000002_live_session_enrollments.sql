-- Table d'inscriptions / billets payants pour les Cours & Salles Live VIP Nanasore
create table if not exists public.live_session_enrollments (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  student_name text not null,
  student_contact text not null,
  amount_paid numeric not null default 0,
  currency text not null default 'XOF',
  transaction_id text,
  payment_method text,
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

create index if not exists idx_live_session_enrollments_lookup
  on public.live_session_enrollments (session_id, student_contact);

alter table public.live_session_enrollments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'live_session_enrollments'
      and policyname = 'live_session_enrollments_public_read'
  ) then
    create policy live_session_enrollments_public_read
      on public.live_session_enrollments for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'live_session_enrollments'
      and policyname = 'live_session_enrollments_public_insert'
  ) then
    create policy live_session_enrollments_public_insert
      on public.live_session_enrollments for insert
      with check (true);
  end if;
end $$;
