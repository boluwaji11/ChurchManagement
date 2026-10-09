-- R16.9, HRT-272. A reaction to a message.
--
-- The shortest answer there is. A church of 50 to 500 running a group thread
-- gets eleven lines of "thanks" under every notice, and one mark against the
-- message says the same thing without burying it.
--
-- One row a person a mark, so pressing it again takes it off and nobody can
-- stack the same mark twice.
create table if not exists message_reactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  message_id uuid not null references messages(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  /** The mark itself, as the character it is. */
  emoji text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists message_reaction_once
  on message_reactions (message_id, member_id, emoji);
create index if not exists message_reaction_message_idx on message_reactions (message_id);
create index if not exists message_reaction_tenant_idx on message_reactions (tenant_id);

alter table message_reactions enable row level security;

drop policy if exists message_reactions_tenant on message_reactions;
create policy message_reactions_tenant on message_reactions
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
