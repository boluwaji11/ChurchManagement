-- R16.11, HRT-162. What a church tells everybody.
--
-- The one thing in F16 that a church can say to its members without holding
-- anybody's credentials: it is written here and read in the portal, so there
-- is no provider, no queue and nothing sent. A member who has turned push on
-- gets a push as well, through the browser's own service, which costs the
-- church nothing.
--
-- Pinned rather than scheduled. A church of 50 to 500 writes one of these a
-- fortnight, and a send time is a setting nobody uses on a thing nobody
-- schedules.
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  body text not null,
  /** R24.4. Which of the twelve it wears in the feed. */
  hue text not null default 'indigo',
  /** R16.11. Held at the top of the feed until it is taken down. */
  pinned boolean not null default false,
  /** Nothing is read by a member until it is published. */
  published_at timestamptz,
  /** After this it comes off the feed on its own. Null means it stays. */
  expires_on date,
  written_by_user_id uuid references app_users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_tenant_idx on announcements (tenant_id);
create index if not exists announcements_feed_idx
  on announcements (tenant_id, published_at desc) where archived_at is null;

alter table announcements enable row level security;

drop policy if exists announcements_tenant on announcements;
create policy announcements_tenant on announcements
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
