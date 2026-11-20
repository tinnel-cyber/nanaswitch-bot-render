-- ==============================================================================
-- WORLD-CLASS EMAILING INFRASTRUCTURE
-- - Suppression list (unsubscribes, hard bounces, spam complaints)
-- - Real-time Brevo webhook telemetry events (delivered, opened, clicked, bounced)
-- - Campaign scheduling, batching, A/B testing & live KPI counters
-- - Per-tenant authenticated sender domains (SPF / DKIM / DMARC)
-- - Atomic KPI increment RPC
-- ==============================================================================

-- 1. Enrich email_campaigns with pro analytics, scheduling & A/B testing columns
alter table if exists public.email_campaigns
  add column if not exists html_content text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists ab_variant_b_subject text,
  add column if not exists batch_count integer not null default 1,
  add column if not exists suppressed_count integer not null default 0,
  add column if not exists delivered_count integer not null default 0,
  add column if not exists opened_count integer not null default 0,
  add column if not exists clicked_count integer not null default 0,
  add column if not exists bounced_count integer not null default 0,
  add column if not exists spam_count integer not null default 0,
  add column if not exists unsubscribed_count integer not null default 0;

create index if not exists idx_email_campaigns_scheduled
  on public.email_campaigns (status, scheduled_at)
  where status = 'scheduled';

create index if not exists idx_email_campaigns_tenant_created
  on public.email_campaigns (tenant_id, sent_at desc);

-- 2. Global & Per-Tenant Suppression List (RGPD / CAN-SPAM / Anti-Bounce)
create table if not exists public.email_unsubscribes (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  email text not null,
  reason text not null default 'unsubscribe', -- 'unsubscribe' | 'hard_bounce' | 'spam_complaint'
  source_campaign_id text,
  unsubscribed_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create index if not exists idx_email_unsubscribes_tenant_email
  on public.email_unsubscribes (tenant_id, email);

alter table public.email_unsubscribes enable row level security;

drop policy if exists email_unsubscribes_service_all on public.email_unsubscribes;
create policy email_unsubscribes_service_all
  on public.email_unsubscribes for all
  to service_role
  using (true) with check (true);

drop policy if exists email_unsubscribes_owner_select on public.email_unsubscribes;
create policy email_unsubscribes_owner_select
  on public.email_unsubscribes for select
  to authenticated
  using (tenant_id = auth.uid()::text);

-- 3. Brevo Real-Time Telemetry Events (Delivered, Open, Click, Bounce, Spam)
create table if not exists public.email_campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id text,
  tenant_id text,
  message_id text,
  recipient_email text not null,
  event_type text not null,
  link_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_email_events_campaign on public.email_campaign_events (campaign_id, occurred_at desc);
create index if not exists idx_email_events_message on public.email_campaign_events (message_id);

alter table public.email_campaign_events enable row level security;

drop policy if exists email_campaign_events_service_all on public.email_campaign_events;
create policy email_campaign_events_service_all
  on public.email_campaign_events for all
  to service_role
  using (true) with check (true);

drop policy if exists email_campaign_events_owner_select on public.email_campaign_events;
create policy email_campaign_events_owner_select
  on public.email_campaign_events for select
  to authenticated
  using (tenant_id = auth.uid()::text);

-- 4. Custom Authenticated Sender Domains (SPF / DKIM / DMARC per merchant)
create table if not exists public.email_sender_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  domain text not null,
  spf_record text not null default 'v=spf1 include:spf.brevo.com ~all',
  dkim_record text,
  dmarc_record text not null default 'v=DMARC1; p=quarantine; rua=mailto:dmarc@nanasore.com',
  verification_status text not null default 'pending', -- 'pending' | 'verified'
  brevo_domain_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, domain)
);

alter table public.email_sender_domains enable row level security;

drop policy if exists email_sender_domains_service_all on public.email_sender_domains;
create policy email_sender_domains_service_all
  on public.email_sender_domains for all
  to service_role
  using (true) with check (true);

drop policy if exists email_sender_domains_owner_select on public.email_sender_domains;
create policy email_sender_domains_owner_select
  on public.email_sender_domains for select
  to authenticated
  using (tenant_id = auth.uid()::text);

-- 5. Atomic KPI Counter Increment RPC (for concurrent Brevo webhooks)
create or replace function public.increment_email_campaign_stat(
  p_message_id text,
  p_stat_column text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_stat_column = 'delivered_count' then
    update public.email_campaigns set delivered_count = delivered_count + 1 where provider_message_id = p_message_id;
  elsif p_stat_column = 'opened_count' then
    update public.email_campaigns set opened_count = opened_count + 1 where provider_message_id = p_message_id;
  elsif p_stat_column = 'clicked_count' then
    update public.email_campaigns set clicked_count = clicked_count + 1 where provider_message_id = p_message_id;
  elsif p_stat_column = 'bounced_count' then
    update public.email_campaigns set bounced_count = bounced_count + 1 where provider_message_id = p_message_id;
  elsif p_stat_column = 'spam_count' then
    update public.email_campaigns set spam_count = spam_count + 1 where provider_message_id = p_message_id;
  elsif p_stat_column = 'unsubscribed_count' then
    update public.email_campaigns set unsubscribed_count = unsubscribed_count + 1 where provider_message_id = p_message_id;
  end if;
end;
$$;

revoke all on function public.increment_email_campaign_stat(text, text) from public, anon, authenticated;
grant execute on function public.increment_email_campaign_stat(text, text) to service_role;
