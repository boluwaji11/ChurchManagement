-- R9.5, R22.2. Where the church's website is actually built.
--
-- Not the same question as who sold them the domain. A church buys the name at
-- GoDaddy and builds the site on Squarespace often enough that reading one off
-- the other sends a volunteer to the wrong screen. The nameservers answer it
-- outright for some providers, wixdns.net and squarespacedns.com among them,
-- and say nothing for the rest, so the church confirms.
--
-- Free text rather than an enum: a church on something nobody has heard of
-- still has a website, and a new builder should not need a migration.
alter table tenants
  add column if not exists site_builder text;
