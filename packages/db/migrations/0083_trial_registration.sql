-- R14.2. A place taken while the event was still a draft.
--
-- A church wants to walk through its own registration before anybody else can,
-- and a test booking must not end up on the roster. These are cleared the
-- moment the event is published.
alter table event_registrations add column if not exists trial boolean not null default false;

create index if not exists event_reg_trial_idx on event_registrations (tenant_id, event_id, trial);
