-- PlayForGood core schema (MVP v1)
-- Apply this file in a new Supabase project SQL editor.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('subscriber', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('inactive', 'active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'lapsed');
  end if;

  if not exists (select 1 from pg_type where typname = 'draw_mode') then
    create type draw_mode as enum ('random', 'weighted');
  end if;

  if not exists (select 1 from pg_type where typname = 'draw_status') then
    create type draw_status as enum ('simulated', 'published', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type verification_status as enum ('not_required', 'pending', 'approved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('pending', 'paid');
  end if;
end $$;

create table if not exists public.charities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text not null,
  long_description text not null,
  image_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.charity_events (
  id uuid primary key default gen_random_uuid(),
  charity_id uuid not null references public.charities(id) on delete cascade,
  title text not null,
  details text,
  event_date date,
  location text,
  image_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role app_role not null default 'subscriber',
  selected_charity_id uuid references public.charities(id),
  charity_percent integer not null default 10 check (charity_percent between 10 and 40),
  country_code text not null default 'IN',
  currency_code text not null default 'INR',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan_type text not null check (plan_type in ('monthly', 'yearly')),
  amount_paise integer not null check (amount_paise >= 0),
  status subscription_status not null default 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists subscriptions_user_status_idx on public.subscriptions(user_id, status);

create table if not exists public.payment_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  stripe_invoice_id text,
  gross_amount_paise integer not null check (gross_amount_paise >= 0),
  prize_pool_amount_paise integer not null check (prize_pool_amount_paise >= 0),
  charity_amount_paise integer not null check (charity_amount_paise >= 0),
  platform_amount_paise integer not null check (platform_amount_paise >= 0),
  currency_code text not null default 'INR',
  status text not null default 'paid',
  paid_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists payment_ledger_user_paid_idx on public.payment_ledger(user_id, paid_at desc);
create unique index if not exists payment_ledger_invoice_unique on public.payment_ledger(stripe_invoice_id) where stripe_invoice_id is not null;

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score_value integer not null check (score_value between 1 and 45),
  played_on date not null,
  inserted_at timestamptz not null default timezone('utc', now())
);

create index if not exists scores_user_inserted_idx on public.scores(user_id, inserted_at desc);

create or replace function public.trim_scores_to_latest_five()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.scores
  where id in (
    select id
    from public.scores
    where user_id = new.user_id
    order by played_on desc, inserted_at desc
    offset 5
  );

  return new;
end;
$$;

drop trigger if exists trim_scores_trigger on public.scores;
create trigger trim_scores_trigger
after insert on public.scores
for each row execute function public.trim_scores_to_latest_five();

create table if not exists public.draw_config (
  id integer primary key default 1,
  mode draw_mode not null default 'random',
  weighted_strategy text not null default 'hot' check (weighted_strategy in ('hot', 'cold', 'hybrid')),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint single_draw_config_row check (id = 1)
);

insert into public.draw_config(id, mode, weighted_strategy)
values (1, 'random', 'hot')
on conflict (id) do nothing;

create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  draw_month text not null,
  mode draw_mode not null,
  numbers_json jsonb not null,
  status draw_status not null default 'simulated',
  simulated_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists published_draw_unique_month
on public.draws(draw_month)
where status = 'published';

create table if not exists public.draw_simulations (
  id uuid primary key default gen_random_uuid(),
  draw_month text not null,
  mode draw_mode not null,
  proposed_numbers_json jsonb not null,
  analysis_json jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.draw_entries_snapshot (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scores_snapshot_json jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.winnings (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_count integer not null check (match_count between 0 and 5),
  match_tier integer check (match_tier in (3,4,5)),
  gross_win_amount_paise integer not null default 0 check (gross_win_amount_paise >= 0),
  verification_status verification_status not null default 'not_required',
  payment_status payment_status not null default 'pending',
  proof_file_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists winnings_user_idx on public.winnings(user_id, created_at desc);

create table if not exists public.jackpot_rollovers (
  id uuid primary key default gen_random_uuid(),
  source_draw_id uuid not null references public.draws(id) on delete cascade,
  target_draw_month text not null,
  carry_amount_paise integer not null check (carry_amount_paise >= 0),
  settled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.independent_donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  charity_id uuid not null references public.charities(id),
  amount_paise integer not null check (amount_paise > 0),
  currency_code text not null default 'INR',
  payment_mode text not null default 'record_only' check (payment_mode in ('record_only', 'razorpay', 'stripe')),
  status text not null default 'recorded' check (status in ('recorded', 'pending', 'paid', 'failed')),
  reference_note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  type text not null,
  channel text not null default 'email',
  status text not null,
  provider_message_id text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  processed_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  actor_role app_role,
  action text not null,
  entity text not null,
  entity_id text,
  before_json jsonb,
  after_json jsonb,
  ip_hash text,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

alter table public.charities enable row level security;
alter table public.charity_events enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_ledger enable row level security;
alter table public.scores enable row level security;
alter table public.draw_config enable row level security;
alter table public.draws enable row level security;
alter table public.draw_simulations enable row level security;
alter table public.draw_entries_snapshot enable row level security;
alter table public.winnings enable row level security;
alter table public.jackpot_rollovers enable row level security;
alter table public.independent_donations enable row level security;
alter table public.notifications_log enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- Public read
drop policy if exists charities_public_read on public.charities;
create policy charities_public_read on public.charities
for select using (is_active = true);

drop policy if exists charity_events_public_read on public.charity_events;
create policy charity_events_public_read on public.charity_events
for select using (true);

drop policy if exists draws_public_read on public.draws;
create policy draws_public_read on public.draws
for select using (status = 'published' or public.is_admin());

-- Profile policies
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update using (id = auth.uid() or public.is_admin());

-- User-owned data policies
drop policy if exists subscriptions_read on public.subscriptions;
create policy subscriptions_read on public.subscriptions
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists payment_ledger_read on public.payment_ledger;
create policy payment_ledger_read on public.payment_ledger
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists scores_crud on public.scores;
create policy scores_crud on public.scores
for all using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists winnings_read on public.winnings;
create policy winnings_read on public.winnings
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists winnings_user_update on public.winnings;
create policy winnings_user_update on public.winnings
for update using (user_id = auth.uid() or public.is_admin());

drop policy if exists donation_read on public.independent_donations;
create policy donation_read on public.independent_donations
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists donation_insert on public.independent_donations;
create policy donation_insert on public.independent_donations
for insert with check (user_id = auth.uid() or user_id is null or public.is_admin());

-- Admin-only tables
drop policy if exists draw_config_admin on public.draw_config;
create policy draw_config_admin on public.draw_config
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists draw_simulations_admin on public.draw_simulations;
create policy draw_simulations_admin on public.draw_simulations
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists draw_entries_admin on public.draw_entries_snapshot;
create policy draw_entries_admin on public.draw_entries_snapshot
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists jackpot_rollovers_admin on public.jackpot_rollovers;
create policy jackpot_rollovers_admin on public.jackpot_rollovers
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists notifications_admin on public.notifications_log;
create policy notifications_admin on public.notifications_log
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists webhook_events_admin on public.stripe_webhook_events;
create policy webhook_events_admin on public.stripe_webhook_events
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists audit_admin on public.audit_logs;
create policy audit_admin on public.audit_logs
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_manage_charities on public.charities;
create policy admin_manage_charities on public.charities
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_manage_events on public.charity_events;
create policy admin_manage_events on public.charity_events
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_manage_subscriptions on public.subscriptions;
create policy admin_manage_subscriptions on public.subscriptions
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_manage_payment_ledger on public.payment_ledger;
create policy admin_manage_payment_ledger on public.payment_ledger
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_manage_winnings on public.winnings;
create policy admin_manage_winnings on public.winnings
for all using (public.is_admin())
with check (public.is_admin());
