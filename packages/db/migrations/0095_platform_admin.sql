-- R21.x. The platform's own operators, and the record of what they do.
--
-- Approving a church, taking one out of service and granting somebody else the
-- same power are not things a church does to itself, so they cannot live in a
-- tenant's tables or be reachable with a tenant's role. These two tables sit
-- outside the tenancy: no tenant_id, no row-level policy keyed on one, and
-- every read of them runs behind a check that the asking account is in the
-- first table.
--
-- The event log follows the same rule as a church's own audit log: append only,
-- no update and no delete, so the record of who approved what survives whoever
-- wrote it.

create table if not exists platform_admins (
  user_id uuid primary key references app_users (id) on delete cascade,
  -- Who they are on a screen, so the log reads as people rather than ids.
  name text not null,
  granted_at timestamptz not null default now(),
  -- Null for the first one, which is written by this migration.
  granted_by uuid references app_users (id) on delete set null,
  revoked_at timestamptz
);

create index if not exists platform_admins_live_idx
  on platform_admins (user_id) where revoked_at is null;

create table if not exists platform_events (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  -- The admin who did it. Kept even if their access is revoked later.
  actor_id uuid references app_users (id) on delete set null,
  actor_name text not null,
  -- approved, unapproved, archived, restored, granted, revoked.
  action text not null,
  -- The church it was done to, when it was done to a church.
  tenant_id uuid references tenants (id) on delete set null,
  tenant_name text,
  -- What the admin typed, which is the part a reader needs a year later.
  note text
);

create index if not exists platform_events_at_idx on platform_events (at desc);
create index if not exists platform_events_tenant_idx on platform_events (tenant_id, at desc);

-- R21.x. Archive, never delete. A church taken out of service keeps every
-- record it holds, stops counting towards anything, and cannot be signed in to.
alter table tenants add column if not exists archived_at timestamptz;
alter table tenants add column if not exists archived_reason text;

comment on column tenants.archived_at is
  'R21.x. When this church was taken out of service. Its records stay.';

-- Both tables are read and written only through the owner connection, behind an
-- admin check in the query layer, so no role an application session can hold
-- reaches them.
alter table platform_admins enable row level security;
alter table platform_events enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'hearth_app') then
    revoke all on platform_admins from hearth_app;
    revoke all on platform_events from hearth_app;
  end if;
end $$;
