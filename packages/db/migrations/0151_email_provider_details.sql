-- HRT-287, R16.1, R21.15. What a church's email connection needs beyond its secret.
--
-- `church_providers` held the sealed credential and the vendor's account id and
-- nothing else, which is enough for Resend and not enough for a church's own
-- mail server: a host, a port and a username are connection details rather than
-- secrets, and they belong beside the credential rather than inside it.
--
-- The address mail goes out as is here too, for both vendors. It is what a
-- member reads in their inbox, so the church sets it once and every send uses
-- it.
alter table church_providers
  add column if not exists from_name text,
  add column if not exists from_address text,
  add column if not exists settings jsonb not null default '{}'::jsonb;
