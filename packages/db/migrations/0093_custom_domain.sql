-- R1.1, R17.1. The church's own address for its members' screens.
--
-- A member reading their serving dates on gracefellowship.org is on the
-- church's site rather than on ours, and the session cookie is first-party,
-- which is the only way the signed-in screens can live inside a church's own
-- domain at all.
--
-- One church a host. Lower case, no scheme and no path: it is compared against
-- the Host header, which arrives that way.
alter table tenants add column if not exists custom_domain text;

create unique index if not exists tenant_custom_domain_unique
  on tenants (custom_domain)
  where custom_domain is not null;
