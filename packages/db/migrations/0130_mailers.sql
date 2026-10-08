-- R16.12, HRT-267. A mailer a church is working on.
--
-- A letter to a congregation is written in the gaps between everything else,
-- and the volunteer writing it closes the laptop halfway through. Held as a
-- record so that is survivable, and saved as it is typed rather than on a
-- button somebody has to remember.
create table if not exists mailers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  /** 'households', 'people', or 'list' with the list named below. */
  recipients text not null default 'households',
  list_id uuid references saved_lists(id) on delete set null,
  /** Which stock the labels print on. A letter ignores it. */
  paper text not null default 'envelope',
  /** How many labels have already gone off the first sheet. */
  skip integer not null default 0,
  /** The words, as markdown, exactly as the editor round-trips them. */
  body text not null default '',
  created_by_user_id uuid references app_users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mailers_tenant_idx on mailers (tenant_id);
create unique index if not exists mailers_name_unique on mailers (tenant_id, name);

alter table mailers enable row level security;

drop policy if exists mailers_tenant on mailers;
create policy mailers_tenant on mailers
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
