-- Tables pour les Enchères Live Shopping & Commissions d'Affiliation Nanasore

create table if not exists public.live_auctions (
  id text primary key,
  session_id text not null,
  product_id text,
  product_name text not null,
  product_image text,
  starting_price numeric not null default 0,
  current_price numeric not null default 0,
  min_step numeric not null default 1000,
  highest_bidder_id text,
  highest_bidder_name text,
  bids_count integer not null default 0,
  status text not null default 'active',
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.live_auction_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id text not null,
  session_id text not null,
  bidder_id text not null,
  bidder_name text not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_live_auction_bids_auction
  on public.live_auction_bids (auction_id, amount desc);

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null,
  session_id text,
  product_id text,
  product_name text not null,
  referrer_code text not null,
  referrer_phone text,
  buyer_name text,
  buyer_contact text,
  order_amount numeric not null default 0,
  commission_percent numeric not null default 10,
  commission_amount numeric not null default 0,
  currency text not null default 'XOF',
  transaction_id text,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_affiliate_commissions_merchant
  on public.affiliate_commissions (merchant_id, created_at desc);

create index if not exists idx_affiliate_commissions_referrer
  on public.affiliate_commissions (referrer_code, created_at desc);

alter table public.live_auctions enable row level security;
alter table public.live_auction_bids enable row level security;
alter table public.affiliate_commissions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'live_auctions' and policyname = 'live_auctions_all') then
    create policy live_auctions_all on public.live_auctions for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'live_auction_bids' and policyname = 'live_auction_bids_all') then
    create policy live_auction_bids_all on public.live_auction_bids for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'affiliate_commissions' and policyname = 'affiliate_commissions_all') then
    create policy affiliate_commissions_all on public.affiliate_commissions for all using (true) with check (true);
  end if;
end $$;
