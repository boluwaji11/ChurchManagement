-- R13.x. Giving: the funds, the counting sessions, the gifts and the church's
-- own Stripe account.
--
-- The platform never holds any of this money. A card gift is a charge on the
-- church's own connected account with no application fee, so the money goes
-- from the giver to the church and Stripe's processing fee comes off the
-- church's balance. These tables are a record of what happened.
create table if not exists funds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  code text,
  restricted boolean not null default false,
  description text,
  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fund_tenant_idx on funds (tenant_id);
create unique index if not exists fund_name_unique on funds (tenant_id, name);

create table if not exists gift_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  received_on date not null,
  expected_cents integer not null default 0,
  counter_one_id uuid references members(id) on delete set null,
  counter_two_id uuid references members(id) on delete set null,
  variance_note text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gift_batch_tenant_idx on gift_batches (tenant_id);
create index if not exists gift_batch_date_idx on gift_batches (tenant_id, received_on);

create table if not exists gifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  fund_id uuid not null references funds(id) on delete restrict,
  batch_id uuid references gift_batches(id) on delete set null,
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  method text not null default 'cash',
  reference text,
  received_on date not null,
  note text,
  in_kind_description text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  fee_cents integer not null default 0,
  covered_fee boolean not null default false,
  refunded_cents integer not null default 0,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gift_tenant_idx on gifts (tenant_id);
create index if not exists gift_date_idx on gifts (tenant_id, received_on);
create index if not exists gift_member_idx on gifts (tenant_id, member_id);
create index if not exists gift_fund_idx on gifts (tenant_id, fund_id);
create index if not exists gift_batch_idx on gifts (tenant_id, batch_id);
-- One gift a payment, so a webhook delivered twice writes one record.
create unique index if not exists gift_intent_unique
  on gifts (tenant_id, stripe_payment_intent_id);

create table if not exists stripe_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  account_id text not null,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  livemode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists stripe_account_tenant_unique on stripe_accounts (tenant_id);
create unique index if not exists stripe_account_id_unique on stripe_accounts (account_id);
