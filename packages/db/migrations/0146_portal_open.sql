-- R1.1, R17.1. Whether the church's address answers at all.
--
-- A church that has not finished setting up, or one that has decided its
-- congregation is not ready for a portal, turns the address off and nobody
-- reaches it. Staff still work at the main address, so nothing a church needs
-- to run its week depends on this being on.
--
-- Default on, because an address nobody can reach is not the state a church
-- signs up expecting.
alter table tenants
  add column if not exists portal_open boolean not null default true;
