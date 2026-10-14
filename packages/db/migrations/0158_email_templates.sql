-- HRT-291, R16.4. A message a church writes once and sends every year.
--
-- The carol service invitation, the giving statement cover, the welcome note
-- to a first-time visitor. A church rewrites these from memory every time and
-- they come out a little worse each year. They belong beside the service
-- templates, which is where a church already looks for a thing it set up once.
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  name text not null,
  subject text not null,
  body text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_template_tenant_idx
  on email_templates (tenant_id, archived_at, name);
