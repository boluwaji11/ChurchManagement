-- R16.9, R9.7, HRT-270. A conversation with a group or a team.
--
-- The same tables as a one-to-one thread, with the group or team named on the
-- conversation. Who is in it is whoever is in the group, read at the moment
-- somebody opens it: a roster that has to be copied into a second table is a
-- roster that goes stale the first time a leader adds somebody.
--
-- A read mark is still per person, written the first time that person reads
-- it, so a group of thirty does not carry thirty rows nobody has used.
alter table conversations add column if not exists group_id uuid references groups(id) on delete cascade;
alter table conversations add column if not exists team_id uuid references teams(id) on delete cascade;

create unique index if not exists conversation_once_a_group
  on conversations (tenant_id, group_id) where group_id is not null;
create unique index if not exists conversation_once_a_team
  on conversations (tenant_id, team_id) where team_id is not null;
