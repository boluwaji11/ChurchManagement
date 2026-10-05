-- R9.5. A group is published before the open web can see it.
--
-- The finder and the group's own public page are places a church shows the
-- world, and a group half written should not be one of them. Draft and
-- published, the same two states an event has.
--
-- Everything already here is published: it was listed under the old rule and
-- taking it off the finder on an upgrade would be a change nobody asked for.
alter table groups add column if not exists status text not null default 'published';

create index if not exists group_status_idx on groups (tenant_id, status);
