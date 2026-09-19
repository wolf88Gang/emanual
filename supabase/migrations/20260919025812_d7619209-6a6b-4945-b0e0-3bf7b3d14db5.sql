-- Checkout attempts created through the ONVO payment gateway.
create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  onvo_session_id text not null unique,
  checkout_url text not null,
  billing_interval text not null check (billing_interval in ('monthly','annual')),
  property_count integer not null default 1 check (property_count > 0),
  addons jsonb not null default '[]'::jsonb,
  currency text not null check (currency in ('USD','CRC')),
  amount_minor bigint not null check (amount_minor > 0),
  status text not null default 'pending' check (status in ('pending','paid','failed','expired')),
  paid_at timestamptz,
  onvo_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.checkout_sessions to authenticated;
grant all on public.checkout_sessions to service_role;

alter table public.checkout_sessions enable row level security;

create policy "Users read own checkout sessions"
  on public.checkout_sessions for select
  to authenticated
  using (user_id = auth.uid() or public.is_platform_admin(auth.uid()));

create index if not exists checkout_sessions_user_idx on public.checkout_sessions(user_id, created_at desc);

-- Subscription rows now carry the ONVO references and what was purchased.
alter table public.subscriptions
  add column if not exists onvo_session_id text,
  add column if not exists onvo_payment_intent_id text,
  add column if not exists billing_interval text,
  add column if not exists property_count integer,
  add column if not exists addons jsonb not null default '[]'::jsonb;