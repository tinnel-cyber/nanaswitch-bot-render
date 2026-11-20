-- Tables officielles NanaSwitch sur Supabase : Transactions, Wallets Vendeurs & Split Financier Idempotent

create table if not exists public.nanaswitch_transactions (
  order_id text primary key,
  external_reference text,
  store_id text not null default 'nanasore_central_hub',
  tenant_id text,
  amount numeric not null default 0,
  currency text not null default 'XOF',
  gateway text not null default 'saspay',
  provider text,
  failed_over boolean not null default false,
  original_gateway text,
  failover_reason text,
  status text not null default 'PENDING',
  payment_url text,
  transaction_id text,
  customer_phone text,
  customer_email text,
  customer_name text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nanaswitch_tx_store on public.nanaswitch_transactions (store_id, created_at desc);
create index if not exists idx_nanaswitch_tx_ext_ref on public.nanaswitch_transactions (external_reference);

create table if not exists public.nanaswitch_wallets (
  store_id text primary key,
  balance numeric not null default 0,
  total_earned numeric not null default 0,
  total_withdrawn numeric not null default 0,
  currency text not null default 'XOF',
  updated_at timestamptz not null default now()
);

create table if not exists public.nanaswitch_splits (
  order_id text primary key,
  store_id text not null,
  transaction_id text not null,
  gateway text not null,
  total_amount numeric not null,
  vendor_share numeric not null,
  platform_commission numeric not null,
  commission_percent numeric not null default 5,
  currency text not null default 'XOF',
  processed_at timestamptz not null default now()
);

alter table public.nanaswitch_transactions enable row level security;
alter table public.nanaswitch_wallets enable row level security;
alter table public.nanaswitch_splits enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'nanaswitch_transactions' and policyname = 'nanaswitch_transactions_all') then
    create policy nanaswitch_transactions_all on public.nanaswitch_transactions for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'nanaswitch_wallets' and policyname = 'nanaswitch_wallets_all') then
    create policy nanaswitch_wallets_all on public.nanaswitch_wallets for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'nanaswitch_splits' and policyname = 'nanaswitch_splits_all') then
    create policy nanaswitch_splits_all on public.nanaswitch_splits for all using (true) with check (true);
  end if;
end $$;
