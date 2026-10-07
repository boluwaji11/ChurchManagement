-- R13.3. A gift that repeats.
--
-- The subscription lives on the church's own Stripe account, the same as every
-- other charge: this table is what the church reads, so a treasurer can see
-- what is expected next month without signing in to Stripe. Each payment still
-- arrives as its own row in gifts.
create table if not exists recurring_gifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  giver_name text,
  giver_email text,
  fund_id uuid references funds(id) on delete set null,
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  -- month or week. What the giver chose.
  interval text not null default 'month',
  stripe_subscription_id text not null,
  stripe_customer_id text,
  -- active, past_due, canceled. Stripe's own word for it.
  status text not null default 'active',
  started_on date,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recurring_gift_tenant_idx on recurring_gifts (tenant_id);
create unique index if not exists recurring_gift_subscription_unique
  on recurring_gifts (stripe_subscription_id);
