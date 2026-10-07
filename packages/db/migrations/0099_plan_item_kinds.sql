-- R11.2. A church writes its own words for what is on a plan.
--
-- The eight kinds were a fixed list in code, which is our vocabulary rather
-- than the church's: a congregation that calls the offering "tithes" or runs a
-- "testimony" every week had to file both under Other. The slug is what a plan
-- item stores, so renaming one leaves every plan reading correctly, and a null
-- name means the built-in word is still the right one.
create table if not exists plan_item_kinds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  slug text not null,
  name text,
  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plan_item_kind_tenant_idx on plan_item_kinds (tenant_id);
create unique index if not exists plan_item_kind_slug_unique on plan_item_kinds (tenant_id, slug);
