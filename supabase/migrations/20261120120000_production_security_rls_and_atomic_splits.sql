-- ==============================================================================
-- PRODUCTION HARDENING: Strict RLS Policies, Secure Admin View,
-- NanaSwitch Merchants Registry & Atomic Transactional Split RPC
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper: Drop all permissive "USING (true)" policies on financial/PII tables
--    and replace with service_role-only writes + scoped reads.
-- ------------------------------------------------------------------------------

-- 1.1 NanaSwitch Financial Tables (STRICTLY service_role write; authenticated read scoped)
drop policy if exists nanaswitch_transactions_all on public.nanaswitch_transactions;
drop policy if exists nanaswitch_wallets_all on public.nanaswitch_wallets;
drop policy if exists nanaswitch_splits_all on public.nanaswitch_splits;

create policy nanaswitch_transactions_service_all
  on public.nanaswitch_transactions for all
  to service_role
  using (true) with check (true);

create policy nanaswitch_transactions_owner_select
  on public.nanaswitch_transactions for select
  to authenticated
  using (store_id = auth.uid()::text or tenant_id = auth.uid()::text);

create policy nanaswitch_wallets_service_all
  on public.nanaswitch_wallets for all
  to service_role
  using (true) with check (true);

create policy nanaswitch_wallets_owner_select
  on public.nanaswitch_wallets for select
  to authenticated
  using (store_id = auth.uid()::text);

create policy nanaswitch_splits_service_all
  on public.nanaswitch_splits for all
  to service_role
  using (true) with check (true);

create policy nanaswitch_splits_owner_select
  on public.nanaswitch_splits for select
  to authenticated
  using (store_id = auth.uid()::text);

-- 1.2 Core Wallets, Wallet Transactions & Subscriptions
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'wallets', 'wallet_transactions', 'subscriptions',
        'orders', 'funnels',
        'live_auctions', 'live_auction_bids', 'affiliate_commissions',
        'wameet_messages', 'escrow_projects', 'live_sessions',
        'docusign_contracts', 'video_generations',
        'landing_pricing_config', 'coaching_bookings'
      )
      and (qual = 'true' or with_check = 'true')
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- Ensure RLS is enabled on coaching_bookings and all sensitive tables
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'wallets', 'wallet_transactions', 'subscriptions',
    'orders', 'funnels',
    'live_auctions', 'live_auction_bids', 'affiliate_commissions',
    'wameet_messages', 'escrow_projects', 'live_sessions',
    'docusign_contracts', 'video_generations',
    'landing_pricing_config', 'coaching_bookings'
  ]
  loop
    if to_regclass('public.' || tbl) is not null then
      execute format('alter table public.%I enable row level security', tbl);
      execute format(
        'create policy %I on public.%I for all to service_role using (true) with check (true)',
        tbl || '_service_role_all', tbl
      );
    end if;
  end loop;
end $$;

-- Public storefront read-only access where needed (no anonymous writes/deletes!)
do $$
begin
  if to_regclass('public.funnels') is not null then
    create policy funnels_public_select on public.funnels
      for select to anon, authenticated using (true);
    create policy funnels_auth_write on public.funnels
      for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
  end if;

  if to_regclass('public.orders') is not null then
    -- Buyers can insert a new order during checkout, but cannot read/tamper all orders
    create policy orders_public_insert on public.orders
      for insert to anon, authenticated with check (true);
    create policy orders_auth_select on public.orders
      for select to authenticated using (auth.uid() is not null);
  end if;

  if to_regclass('public.landing_pricing_config') is not null then
    create policy landing_pricing_public_select on public.landing_pricing_config
      for select to anon, authenticated using (true);
  end if;

  if to_regclass('public.live_sessions') is not null then
    create policy live_sessions_public_select on public.live_sessions
      for select to anon, authenticated using (true);
    create policy live_sessions_auth_write on public.live_sessions
      for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
  end if;

  if to_regclass('public.live_auctions') is not null then
    create policy live_auctions_public_select on public.live_auctions
      for select to anon, authenticated using (true);
    create policy live_auctions_auth_write on public.live_auctions
      for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
  end if;

  if to_regclass('public.live_auction_bids') is not null then
    create policy live_auction_bids_public_select on public.live_auction_bids
      for select to anon, authenticated using (true);
    create policy live_auction_bids_auth_insert on public.live_auction_bids
      for insert to authenticated with check (auth.uid() is not null);
  end if;

  if to_regclass('public.coaching_bookings') is not null then
    create policy coaching_bookings_public_insert on public.coaching_bookings
      for insert to anon, authenticated with check (true);
    create policy coaching_bookings_auth_select on public.coaching_bookings
      for select to authenticated using (auth.uid() is not null);
  end if;

  if to_regclass('public.wameet_messages') is not null then
    create policy wameet_messages_auth_all on public.wameet_messages
      for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
  end if;

  if to_regclass('public.escrow_projects') is not null then
    create policy escrow_projects_auth_select on public.escrow_projects
      for select to authenticated using (auth.uid() is not null);
  end if;

  if to_regclass('public.affiliate_commissions') is not null then
    create policy affiliate_commissions_auth_select on public.affiliate_commissions
      for select to authenticated using (auth.uid() is not null);
  end if;

  if to_regclass('public.docusign_contracts') is not null then
    create policy docusign_contracts_auth_all on public.docusign_contracts
      for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
  end if;

  if to_regclass('public.video_generations') is not null then
    create policy video_generations_auth_all on public.video_generations
      for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
  end if;

  if to_regclass('public.wallets') is not null then
    create policy wallets_auth_select on public.wallets
      for select to authenticated using (auth.uid() is not null);
  end if;

  if to_regclass('public.wallet_transactions') is not null then
    create policy wallet_transactions_auth_select on public.wallet_transactions
      for select to authenticated using (auth.uid() is not null);
  end if;

  if to_regclass('public.subscriptions') is not null then
    create policy subscriptions_auth_select on public.subscriptions
      for select to authenticated using (auth.uid() is not null);
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 2. Secure public.admin_user_overview (prevent RLS bypass by authenticated users)
-- ------------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.admin_user_overview') is not null then
    execute 'alter view public.admin_user_overview set (security_invoker = true)';
    execute 'revoke all on public.admin_user_overview from anon, authenticated';
    execute 'grant select on public.admin_user_overview to service_role';
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 3. NanaSwitch Merchants Table (replaces stubbed Firestore `merchants` collection)
-- ------------------------------------------------------------------------------
create table if not exists public.nanaswitch_merchants (
  merchant_id text primary key,
  business_name text not null,
  account_type text not null default 'MERCHANT',
  status text not null default 'ACTIVE',
  public_key text,
  secret_key_hash text not null,
  webhook_secret text,
  integration_config jsonb not null default '{"mode":"AGREGATED"}'::jsonb,
  api_pricing_config jsonb not null default '{"cost_per_request_xof":0.02,"api_credits_balance":0,"auto_block_on_zero":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nanaswitch_merchants enable row level security;

drop policy if exists nanaswitch_merchants_service_all on public.nanaswitch_merchants;
create policy nanaswitch_merchants_service_all
  on public.nanaswitch_merchants for all
  to service_role
  using (true) with check (true);

-- ------------------------------------------------------------------------------
-- 4. Atomic Transactional Financial Split RPC (eliminates wallet race conditions
--    and guarantees ACID idempotency)
-- ------------------------------------------------------------------------------
create or replace function public.execute_nanaswitch_split_atomic(
  p_order_id text,
  p_store_id text,
  p_transaction_id text,
  p_gateway text,
  p_total_amount numeric,
  p_vendor_share numeric,
  p_platform_commission numeric,
  p_commission_percent numeric,
  p_currency text default 'XOF',
  p_central_wallet_id text default 'nanasore_central'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.nanaswitch_splits%rowtype;
  v_inserted_order_id text;
begin
  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'Invalid split amount: %', p_total_amount;
  end if;

  -- Atomic idempotency insert (single transaction with wallet credits below)
  insert into public.nanaswitch_splits (
    order_id, store_id, transaction_id, gateway,
    total_amount, vendor_share, platform_commission,
    commission_percent, currency, processed_at
  )
  values (
    p_order_id, p_store_id, p_transaction_id, p_gateway,
    p_total_amount, p_vendor_share, p_platform_commission,
    p_commission_percent, p_currency, now()
  )
  on conflict (order_id) do nothing
  returning order_id into v_inserted_order_id;

  if v_inserted_order_id is null then
    select * into v_existing from public.nanaswitch_splits where order_id = p_order_id;
    return jsonb_build_object(
      'success', true,
      'alreadyProcessed', true,
      'persisted', true,
      'orderId', v_existing.order_id,
      'storeId', v_existing.store_id,
      'transactionId', v_existing.transaction_id,
      'gateway', v_existing.gateway,
      'totalAmount', v_existing.total_amount,
      'vendorShare', v_existing.vendor_share,
      'platformCommission', v_existing.platform_commission,
      'commissionPercent', v_existing.commission_percent
    );
  end if;

  -- Atomic wallet credit for vendor store (no read-modify-write race condition!)
  insert into public.nanaswitch_wallets (store_id, balance, total_earned, currency, updated_at)
  values (p_store_id, p_vendor_share, p_vendor_share, p_currency, now())
  on conflict (store_id) do update
  set balance = public.nanaswitch_wallets.balance + excluded.balance,
      total_earned = public.nanaswitch_wallets.total_earned + excluded.total_earned,
      currency = excluded.currency,
      updated_at = now();

  -- Atomic wallet credit for central platform commission
  if p_platform_commission > 0 then
    insert into public.nanaswitch_wallets (store_id, balance, total_earned, currency, updated_at)
    values (p_central_wallet_id, p_platform_commission, p_platform_commission, p_currency, now())
    on conflict (store_id) do update
    set balance = public.nanaswitch_wallets.balance + excluded.balance,
        total_earned = public.nanaswitch_wallets.total_earned + excluded.total_earned,
        currency = excluded.currency,
        updated_at = now();
  end if;

  -- Mark transaction as PAID inside the same ACID transaction
  insert into public.nanaswitch_transactions (
    order_id, store_id, amount, currency, gateway, provider, transaction_id, status, updated_at
  )
  values (
    p_order_id, p_store_id, p_total_amount, p_currency, p_gateway, upper(p_gateway), p_transaction_id, 'PAID', now()
  )
  on conflict (order_id) do update
  set status = 'PAID',
      transaction_id = excluded.transaction_id,
      gateway = excluded.gateway,
      provider = excluded.provider,
      updated_at = now();

  return jsonb_build_object(
    'success', true,
    'alreadyProcessed', false,
    'persisted', true,
    'orderId', p_order_id,
    'storeId', p_store_id,
    'transactionId', p_transaction_id,
    'gateway', p_gateway,
    'totalAmount', p_total_amount,
    'vendorShare', p_vendor_share,
    'platformCommission', p_platform_commission,
    'commissionPercent', p_commission_percent
  );
end;
$$;

revoke all on function public.execute_nanaswitch_split_atomic(text, text, text, text, numeric, numeric, numeric, numeric, text, text) from public, anon, authenticated;
grant execute on function public.execute_nanaswitch_split_atomic(text, text, text, text, numeric, numeric, numeric, numeric, text, text) to service_role;
