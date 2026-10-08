-- R16.9, R17.1, HRT-269. In-app messages.
--
-- The part of communication a church can run with no provider and no
-- credentials: written here, read here, nothing sent and nothing resold.
--
-- One thread between the office and one member. The office is a role rather
-- than a person, so the thread carries two read marks instead of a row a
-- reader: a question that came off the unread list because a volunteer opened
-- it by accident is a question nobody answers.
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  member_read_at timestamptz,
  staff_read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_tenant_idx
  on conversations (tenant_id, last_message_at desc);
create unique index if not exists conversation_once_a_member
  on conversations (tenant_id, member_id);

alter table conversations enable row level security;

drop policy if exists conversations_tenant on conversations;
create policy conversations_tenant on conversations
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- One message. Never edited after it is sent, never hard deleted.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  /** 'member' or 'church', which is who it reads as rather than who typed it. */
  side text not null,
  author_user_id uuid references app_users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx on messages (conversation_id, created_at);
create index if not exists messages_tenant_idx on messages (tenant_id);

alter table messages enable row level security;

drop policy if exists messages_tenant on messages;
create policy messages_tenant on messages
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
