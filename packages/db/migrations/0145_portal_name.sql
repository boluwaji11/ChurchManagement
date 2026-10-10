-- R1.1, R17.1. The name a church chooses for its members' address.
--
-- Members sign in at <name>.connectapp.church. The church picks the name, we
-- own the domain and hold the certificate, and nothing is asked of the
-- church's own DNS.
--
-- Separate from the slug. The slug is in every link the product has written
-- down, so it cannot be changed without breaking them, and a church that
-- wants to be "onefamily" rather than "riverside" is asking about the address
-- its congregation types rather than about an identifier.
alter table tenants add column if not exists portal_name text;

-- One church a name. Checked against the slug as well in the query layer, so
-- a chosen name cannot shadow another church's own address.
create unique index if not exists tenant_portal_name_unique
  on tenants (portal_name) where portal_name is not null;
