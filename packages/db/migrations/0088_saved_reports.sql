-- R18.x. A report a church built and kept.
--
-- The spec names a subject, its filters, its columns and what it is counted by,
-- every one of them a key from a fixed catalogue. No SQL is ever stored here
-- and none is ever built from what somebody typed.
create table if not exists saved_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  -- "people", "attendance" or "followups". What the report counts.
  subject text not null,
  -- The spec: filters, columns, what it is counted by. Checked against the
  -- field catalogue every time it is read.
  spec jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_reports_tenant_idx on saved_reports (tenant_id);
create unique index if not exists saved_reports_name_unique on saved_reports (tenant_id, name);
