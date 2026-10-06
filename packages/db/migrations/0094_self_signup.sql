-- R1.7, R22.1. The church code goes, and a switch takes its place.
--
-- A code was a shared password for a church: it never expired, it was used any
-- number of times, and anybody who ever saw it had a way in forever. The
-- designed flow has no code in it. Staff arrive by invitation, which already
-- carries a role and an expiry, and everybody else arrives through the church's
-- own address, where the URL says which church it is.
--
-- A church that had turned joining off keeps it off: the code being null was
-- what "off" meant.

alter table tenants add column if not exists self_signup boolean not null default true;

update tenants set self_signup = (join_code is not null);

drop index if exists tenants_join_code_key;
alter table tenants drop column if exists join_code;

comment on column tenants.self_signup is
  'R1.7. Whether somebody can make an account from the church''s own address.';
