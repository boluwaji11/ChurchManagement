-- R13.16. Campaigns, and what people have committed to them.
--
-- A campaign is a target over a period, against one fund: "the roof, $80,000,
-- by next Easter". A pledge is one household's commitment to it. Progress is
-- the gifts to that fund inside the period, so nothing has to be reconciled by
-- hand and a gift counts once.
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  fund_id uuid not null references funds(id) on delete restrict,
  target_cents integer not null default 0,
  starts_on date not null,
  ends_on date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaign_tenant_idx on campaigns (tenant_id);
create unique index if not exists campaign_name_unique on campaigns (tenant_id, name);

create table if not exists pledges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  -- Whoever made the commitment. Their household is what progress is counted
  -- across, so a couple pledging once is not asked twice.
  member_id uuid not null references members(id) on delete cascade,
  amount_cents integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pledge_tenant_idx on pledges (tenant_id);
create unique index if not exists pledge_once on pledges (campaign_id, member_id);
