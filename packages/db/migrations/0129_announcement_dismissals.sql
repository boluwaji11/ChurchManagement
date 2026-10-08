-- R16.11. A notice a member has taken off their own screen.
--
-- Theirs alone: the notice stays on the board and on everybody else's feed.
-- A member who has read that the office moves should not read it for another
-- fortnight, and a church should not have to take a notice down early because
-- the people who have read it are tired of it.
create table if not exists announcement_dismissals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  announcement_id uuid not null references announcements(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists announcement_dismissal_once
  on announcement_dismissals (announcement_id, user_id);
create index if not exists announcement_dismissal_tenant_idx
  on announcement_dismissals (tenant_id, user_id);

alter table announcement_dismissals enable row level security;

drop policy if exists announcement_dismissals_tenant on announcement_dismissals;
create policy announcement_dismissals_tenant on announcement_dismissals
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
