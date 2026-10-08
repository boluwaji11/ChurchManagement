-- R16.9, R17.1, HRT-271. Messages with somebody on the other end.
--
-- The first build had one thread a member and no way to say who a message was
-- for: everything a member wrote went to the office, because the office was
-- the only place a thread could go. A church is not one desk. A member writes
-- to the office about the hall and to their group leader about Tuesday, and
-- those are two conversations with two different people.
--
-- So a conversation has people in it. The office is one of them, as a role
-- rather than as a person, because whoever is on staff this month answers and
-- a thread belongs to the church rather than to whoever happened to reply.
-- Everybody else is a member, and the read mark is per person, so what one
-- reader has seen is theirs alone.
drop table if exists messages;
drop table if exists conversations;

create table conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  /** 'church' for a thread with the office, 'direct' between two people. */
  kind text not null default 'church',
  last_message_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_tenant_idx on conversations (tenant_id, last_message_at desc);

alter table conversations enable row level security;
drop policy if exists conversations_tenant on conversations;
create policy conversations_tenant on conversations
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Who is in a conversation. One row a person, plus one for the office where
-- the church itself is in it.
create table conversation_people (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  /** True on the one row that stands for the church office. */
  office boolean not null default false,
  last_read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index conversation_person_once
  on conversation_people (conversation_id, member_id) where member_id is not null;
create unique index conversation_office_once
  on conversation_people (conversation_id) where office;
create index conversation_people_member_idx on conversation_people (tenant_id, member_id);

alter table conversation_people enable row level security;
drop policy if exists conversation_people_tenant on conversation_people;
create policy conversation_people_tenant on conversation_people
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- One message. Never edited after it is sent, never hard deleted.
create table messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  /** Written as the church rather than as the person who typed it. */
  from_office boolean not null default false,
  author_member_id uuid references members(id) on delete set null,
  author_user_id uuid references app_users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index messages_thread_idx on messages (conversation_id, created_at);
create index messages_tenant_idx on messages (tenant_id);

alter table messages enable row level security;
drop policy if exists messages_tenant on messages;
create policy messages_tenant on messages
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- A message somebody started and has not sent. One a recipient, so coming
-- back to it finds what was typed rather than an empty box.
create table message_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  /** 'office', or the id of the member it is addressed to. */
  target text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index message_draft_once on message_drafts (tenant_id, user_id, target);

alter table message_drafts enable row level security;
drop policy if exists message_drafts_tenant on message_drafts;
create policy message_drafts_tenant on message_drafts
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
